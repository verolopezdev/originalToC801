// hooks/useRecurringExpense.ts
import { useCallback } from 'react';
import { db, RecurringSeries } from '../db';
import dayjs from 'dayjs';
import { getNextDueDate } from '../utils/recurrenceFunctions';
import { useExpense } from '../context/ExpenseContext';
import { getExchangeRateDirect } from '../context/ExchangeRateContext';
import { getOldestOverdueExpenseForSeries } from '../utils/recurrenceFunctions';


export interface RecurrenceSettings {
  isRecurring: number;
  unit: 'week' | 'month' | 'year';
  interval: number;
  endCondition: 'never' | 'afterOccurrences' | 'onDate'; 
  totalOccurrences: number | null;
  endDate: string | null;
  logAutomatically: boolean;
  lastLoggedDate: string; // last logged expense date
  lastLoggedInstallmentIndex: number; // last logged expense installment index
  amountVaries?: boolean;
}

export interface ExpenseBase { 
  userId: string;
  expenseNote: string;
  accountId: string;
  categoryId: string;
  subcategoryId: string;
  expenseAmountDefault: number;
  expenseAmountTrip: number;
  expenseAmountAlt: number;
  expenseCurrencyCode: string;
  expenseLocale: string;
  tripId: string | null;
  installmentIndex?: number;
}


// Compare two date-like values by local calendar day (YYYY-MM-DD), ignoring time.
function sameDay(a: string | Date, b: string | Date): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}


function computeScheduledDate(series: RecurringSeries, installmentIndex: number): string {
  const start = new Date(series.startDate);
  let scheduled = new Date(start);

  const { unit, interval } = series;
  if (unit === 'month') {
    scheduled.setMonth(start.getMonth() + (installmentIndex * interval));
  } else if (unit === 'week') {
    scheduled.setDate(start.getDate() + (installmentIndex * interval * 7));
  } else if (unit === 'year') {
    scheduled.setFullYear(start.getFullYear() + (installmentIndex * interval));
  }

  return scheduled.toISOString();
}




export const useRecurringExpense = () => {
  const { checkExpense, checkRecurrence } = useExpense(); 
  
  const addExpenseWithRecurrence = useCallback(
    async (
      base: ExpenseBase,
      selectedDate: Date,
      recurrence: RecurrenceSettings  
    ) => {
      // 🚨 FIX HERE: Wrap the entire operation in a transaction that includes all touched tables 🚨
      return await db.transaction('rw', db.expenses, db.recurringSeries, async (tx) => {
        const expensesTable = tx.table('expenses');
        const recurringSeriesTable = tx.table('recurringSeries');

        const { isRecurring } = recurrence;

        if (!isRecurring) {
          await expensesTable.add({
            ...base,
            expenseDate: selectedDate.toISOString(),
            isActive: 1,
          });

          checkExpense();
          return;
        }

        const seriesId = `rcr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const isFutureExpense = dayjs(selectedDate).isAfter(dayjs());

        // Save recurring series metadata regardless of endCondition
        const newSeries: RecurringSeries & { nextDueDate?: string | null } = {
          seriesId,
          userId: base.userId,
          unit: recurrence.unit,
          interval: recurrence.interval,
          startDate: selectedDate.toISOString(),  
          isActive: 1,
          totalOccurrences: recurrence.totalOccurrences ?? null,
          endDate: recurrence.endCondition === 'onDate' ? recurrence.endDate : null, // 👈 store only if used 
          logAutomatically: recurrence.logAutomatically,
          accountId: base.accountId,
          categoryId: base.categoryId,
          subcategoryId: base.subcategoryId,
          note: base.expenseNote,
          estimatedAmount: recurrence.amountVaries ? base.expenseAmountDefault : 0,
          amountDefault: base.expenseAmountDefault,
          amountAlt: base.expenseAmountAlt,
          currencyCode: base.expenseCurrencyCode,
          locale: base.expenseLocale,
          lastLoggedDate: isFutureExpense ? '' : selectedDate.toISOString(),
          lastLoggedInstallmentIndex: isFutureExpense ? 0 : 1,
          originalNextDueDate: selectedDate.toISOString(),
          nextDueDate: isFutureExpense ? selectedDate.toISOString() : ''  
        };

        // Calculate next due date before saving
        if (!isFutureExpense) {
          const newDate = getNextDueDate(newSeries);
          newSeries.originalNextDueDate = newSeries.nextDueDate = newDate;
        }
      
        // Add the first expense **only if selectedDate is today or before**
        const isTodayOrPast = dayjs(selectedDate).isSameOrBefore(dayjs(), 'day');

        if (isTodayOrPast) {
          
          await expensesTable.add({
            ...base,
            dueDate: selectedDate.toISOString(),
            expenseDate: selectedDate.toISOString(),
            seriesId,
            installmentIndex: 1,
            totalInstallments: recurrence.totalOccurrences ?? undefined,
            autoLogged: recurrence.logAutomatically,
            isActive: 1,
          });
    

          if(recurrence.amountVaries) {
            newSeries.amountDefault = 0;
            newSeries.amountAlt = 0;  
          }
          checkExpense();
        }

        await recurringSeriesTable.add(newSeries);
      checkRecurrence();
    }); 
    // 🚨 END FIX 🚨
    },
    [checkExpense, checkRecurrence]
  );


  const updateExpenseWithRecurrence = useCallback(
    async (
      expenseId: string,
      base: ExpenseBase,
      selectedDate: Date,
      existingSeriesId?: string,
    ) => {

      const newDate = selectedDate.toISOString();

      await db.transaction(
        'rw', 
        db.expenses,
        async (tx) => {
          // 1. Update the expense itself
          await tx.expenses.update(expenseId, {
            ...base,
            expenseDate: newDate,
          });
        }
      );

      checkExpense();

      if(!existingSeriesId) return;
      if(!base.installmentIndex) return;

      // 2. Get the related recurring series
      const series = await db.recurringSeries.get(existingSeriesId);
      if (!series) return;

      // 3. Compute the scheduled date for this installment
      const scheduledDate = computeScheduledDate(series, base.installmentIndex - 1);

      // 4. Prepare the moved map
      const moved = { ...(series.moved || {}) };

      if (sameDay(newDate,scheduledDate)) {
        // If user reverted to original date, remove override
        if (moved[base.installmentIndex]) {
          delete moved[base.installmentIndex];
        }
      } else {
        // If date differs from schedule, store override
        moved[base.installmentIndex] = newDate;
      }

    await db.transaction(
      'rw', 
      db.recurringSeries,
      async (tx) => {
        // 5. Update the series only if there’s a change
        await tx.recurringSeries.update(existingSeriesId, { moved });
      }
    );

    checkRecurrence();
    },
    []
  );


  // log a single expense manually, with optional overrides
  const logExpenseForSeries = useCallback(
    async (
      seriesId: string, 
      baseOverride?: Partial<ExpenseBase>, 
      markDeleted: boolean = false
    ): Promise<boolean> => {
      return await db.transaction('rw', db.expenses, db.recurringSeries, async (tx) => {  
        const series = await tx.recurringSeries.get(seriesId);
        if (!series) {
          console.warn("Series not found", seriesId);
          return false;
        }

        const today = dayjs().startOf('day');

        // Get last logged expense for series
        const lastExpense = await tx.expenses
          .where('seriesId')
          .equals(series.seriesId!) // !treat it as defined
          .reverse()
          .sortBy('installmentIndex')
          .then(res => res[0]);

        const lastInstallmentIndex = lastExpense?.installmentIndex ?? 0;
        const nextIndex = lastInstallmentIndex + 1;

        // Decide dueDate: use nextDueDate if present, otherwise calculate from startDate
        const originalDueDate = series.nextDueDate
          ? dayjs(series.nextDueDate)
          : dayjs(series.startDate).add(series.interval * lastInstallmentIndex, series.unit);

        const currentDueDate = today;
        const dueDateIso = currentDueDate.toISOString();

        // Prevent duplicates
        const existing = await tx.expenses
          .where('[seriesId+installmentIndex]')
          .equals([series.seriesId!, nextIndex])
          .first();

        if (existing) {
          return false;
        }

        // Convert amount if needed
        let seriesAmountDefault = series.amountDefault;
        if (series.amountAlt > 0) {
          const rate = await getExchangeRateDirect(series.currencyCode);
          if (rate) {
            seriesAmountDefault = Math.round(series.amountAlt / rate);
          }
        }

        // ✅ Add expense
        await tx.expenses.add({
          // Pull from series by default, then override with passed baseOverride
          userId: series.userId,
          dueDate: originalDueDate.toISOString(),
          expenseDate: dueDateIso,
          expenseNote: series.note,
          accountId: series.accountId,
          categoryId: series.categoryId,
          subcategoryId: series.subcategoryId,
          expenseAmountDefault: seriesAmountDefault,
          expenseAmountTrip: 0,
          expenseAmountAlt: series.amountAlt,
          expenseCurrencyCode: series.currencyCode,
          expenseLocale: series.locale || "en-US",
          tripId: null,
          seriesId: series.seriesId,
          installmentIndex: nextIndex,
          totalInstallments: series.totalOccurrences ?? undefined,
          autoLogged: false,
          isActive: markDeleted ? 2 : 1,
          ...(markDeleted ? { deletionDate: new Date().toISOString() } : {}),
          ...(baseOverride ?? {}), // 👈 merge overrides here
        });

        // Calculate new nextDueDate
        const nextInstallmentDate = dayjs(series.startDate).add(
          series.interval * nextIndex,
          series.unit
        );

        let nextInstallmentIso: string | null = null;
        let activeStatus = 1;

        if (
          (!series.endDate || nextInstallmentDate.isSameOrBefore(series.endDate)) &&
          (!series.totalOccurrences || nextIndex + 1 <= series.totalOccurrences)
        ) {
          nextInstallmentIso = nextInstallmentDate.toISOString();
        } else {
          nextInstallmentIso = null;
          const hasOverdue = await getOldestOverdueExpenseForSeries(series.seriesId!);
          activeStatus = hasOverdue ? 2 : 0;
        }

        const amountInCents = series.estimatedAmount > 0 // If series.estimatedAmount is greater than 0 → use it.
          ? series.estimatedAmount
          : series.amountAlt > 0 // Else if series.amountAlt is greater than 0 → use that.
            ? series.amountAlt
            : series.amountDefault;	// Otherwise → fallback to series.amountDefault	


        await tx.recurringSeries.update(series.seriesId, {
          lastLoggedDate: dueDateIso,
          lastLoggedInstallmentIndex: nextIndex,
          nextDueDate: nextInstallmentIso,
          originalNextDueDate: nextInstallmentIso,
          isActive: activeStatus,
          estimatedAmount: series.estimatedAmount > 0 ? amountInCents : 0, // Resets amount to last entered for next expense
          amountDefault: series.estimatedAmount > 0 ? 0 : series.amountDefault, // Sets to 0 if estimated amount is operable
          amountAlt: series.estimatedAmount > 0 ? 0 : series.amountAlt
        });


        checkExpense();
        checkRecurrence();

        return true;
      });
    },
    [checkExpense, checkRecurrence]
  );


  // Pay off OR just stop remaining installments
  const finalizeRemainingInstallments = useCallback(
    async (
      seriesId: string,
      options?: {
        payoff?: boolean; // true = log payoff expense, false = just cancel
        baseOverride?: Partial<ExpenseBase>;
      }
    ): Promise<boolean> => {
      //console.log("---- START FINALIZE REMAINING INSTALLMENTS ----");
    
      return await db.transaction('rw', db.expenses, db.recurringSeries, async (tx) => {
        const series = await tx.recurringSeries.get(seriesId);
        if (!series) {
          console.warn("Series not found", seriesId);
          return false;
        }
    
        const today = dayjs().startOf('day');
    
        // Get last logged expense for series
        const lastExpense = await tx.expenses
          .where('seriesId')
          .equals(series.seriesId!)
          .reverse()
          .sortBy('installmentIndex')
          .then(res => res[0]);
    
        const lastInstallmentIndex = lastExpense?.installmentIndex ?? 0;
        const totalOccurrences = series.totalOccurrences ?? 0;
    
        const remainingCount =
          totalOccurrences > 0 ? totalOccurrences - lastInstallmentIndex : 0;
    
        if (remainingCount <= 0) {
          console.warn("No remaining installments to finalize.");
          return false;
        }
    
        // Convert amount if needed
        let seriesAmountDefault = series.amountDefault;
        if (series.amountAlt > 0) {
          const rate = await getExchangeRateDirect(series.currencyCode);
          if (rate) {
            seriesAmountDefault = Math.round(series.amountAlt / rate);
          }
        }
    
        if (options?.payoff) {
          // ✅ Add single payoff expense for remaining installments
          const totalPayoffAmount = seriesAmountDefault * remainingCount;
    
          await tx.expenses.add({
            userId: series.userId,
            dueDate: today.toISOString(),
            expenseDate: today.toISOString(),
            expenseNote: `${series.note || ""} (payoff for ${remainingCount} remaining installments)`,
            accountId: series.accountId,
            categoryId: series.categoryId,
            subcategoryId: series.subcategoryId,
            expenseAmountDefault: totalPayoffAmount,
            expenseAmountTrip: 0,
            expenseAmountAlt: series.amountAlt * remainingCount,
            expenseCurrencyCode: series.currencyCode,
            expenseLocale: series.locale || "en-US",
            tripId: null,
            seriesId: series.seriesId,
            installmentIndex: lastInstallmentIndex + 1, // could mark as final
            totalInstallments: totalOccurrences,
            autoLogged: false,
            isActive: 1,
            ...(options.baseOverride ?? {}),
          });
        }

        let i = 1;
        if(options?.payoff) i = i + 1;
    
        // ✅ Generate cancelled expenses for each remaining installment
        for (i ; i <= remainingCount; i++) {
          const installmentIndex = lastInstallmentIndex + i;
    
          const dueDate = dayjs(series.startDate).add(
            series.interval * (installmentIndex - 1),
            series.unit
          );
    
          await tx.expenses.add({
            userId: series.userId,
            dueDate: dueDate.toISOString(),
            expenseDate: today.toISOString(),
            expenseNote: `${series.note || ""} (cancelled installment ${installmentIndex})`,
            accountId: series.accountId,
            categoryId: series.categoryId,
            subcategoryId: series.subcategoryId,
            expenseAmountDefault: seriesAmountDefault,
            expenseAmountTrip: 0,
            expenseAmountAlt: series.amountAlt,
            expenseCurrencyCode: series.currencyCode,
            expenseLocale: series.locale || "en-US",
            tripId: null,
            seriesId: series.seriesId,
            installmentIndex,
            totalInstallments: totalOccurrences,
            autoLogged: false,
            isActive: 3,
            deletionDate: today.toISOString(),
          });
        }
    
        // ✅ Finalize recurrence
        await tx.recurringSeries.update(series.seriesId, {
          lastLoggedDate: today.toISOString(),
          lastLoggedInstallmentIndex: totalOccurrences,
          nextDueDate: null,
          originalNextDueDate: null,
          isActive: 0,
        });
    
        checkExpense();
        checkRecurrence();
    
        return true;
      });
    },
    [checkExpense, checkRecurrence]
  );    

  return {
    addExpenseWithRecurrence,
    updateExpenseWithRecurrence,
    logExpenseForSeries,
    finalizeRemainingInstallments,
  };
};



