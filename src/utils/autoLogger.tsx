import { db } from '../db';
import dayjs from 'dayjs';
import { RecurringSeries } from '../db';
import { getOldestOverdueExpenseForSeries } from '../utils/recurrenceFunctions';
import { getExchangeRateDirect } from '../context/ExchangeRateContext';

/*
Calculates the next date by adding interval units (day, week, month, or year) to the startDate.
Returns a dayjs object.
*/
export const getNextDate = (startDate: Date, unit: 'day' | 'week' | 'month' | 'year', interval: number): dayjs.Dayjs => {
    return dayjs(startDate).add(interval, unit);
};

/*
Accepts a recurring series and optionally the lastGeneratedDate (the last date a recurring expense was created).
Returns a list of ISO strings for each missing due date up to today.
*/
export const getDueDates = (  
  series: RecurringSeries,
  lastGeneratedDate?: string
): string[] => {
  const dueDates: string[] = [];
  let current = dayjs(lastGeneratedDate || series.startDate); // starts at the lastGeneratedDate or the series startDate
  const today = dayjs().startOf('day'); // set to the start of the current day

	// This loop generates all "missed" due dates up to today.
	// Stops as soon as the next date exceeds today
  while (current.isBefore(today)) {
    const next = getNextDate(current.toDate(), series.unit, series.interval);
    if (next.isAfter(today)) break;
    dueDates.push(next.toISOString());
    current = next;
  }

  return dueDates;
};




export const logAutoExpenses = async (): Promise<boolean> => {
  //console.log("Log auto expenses executed...");
  const today = dayjs().startOf('day');
  let hasChanges = false;

  await db.transaction('rw', db.expenses, db.recurringSeries, async (tx) => {
    const todayEnd = dayjs().endOf('day').toISOString();

    const autoSeries = await tx.recurringSeries
      .where('isActive')
      .notEqual(0)
      .and(series => !!series.nextDueDate && series.nextDueDate <= todayEnd)
      .toArray();

    for (const series of autoSeries) {
      // Determine if logging should be automatic based on the original series flag
      // !! effectively converts any value into its true boolean representation without changing its truthiness.
      let shouldLogAutomatically = !!series.logAutomatically;
      
      // New logic: Check if both amounts are 0
      const isZeroAmountSeries = (series.amountDefault ?? 0) === 0 && (series.amountAlt ?? 0) === 0;

      if (isZeroAmountSeries) {
        // If amounts are 0, we treat it the same as if logAutomatically was 0,
        // which means the expense is created but not 'autoLogged' (it will be pending/overdue).
        //console.log(`Series ${series.seriesId} has zero amounts. Treating as manual log.`);
        shouldLogAutomatically = false;
      }/*  else if (!shouldLogAutomatically) {
        // Skip series that are not zero amount AND are not set to logAutomatically (original behavior for manual/pending series)
        console.log(`Skipping series ${series.seriesId} because logAutomatically is 0`);
        continue;
      } */

      // Find the last logged expense
      const lastExpense = await tx.expenses 
        .where('seriesId')
        .equals(series.seriesId)
        .reverse()
        .sortBy('installmentIndex')
        .then(res => res[0]);

      const lastInstallmentIndex = lastExpense?.installmentIndex ?? 0;
      const seriesEndDate = series.endDate ? dayjs(series.endDate).endOf('day') : null;

      // Start from nextDueDate if available, otherwise from startDate + lastInstallmentIndex * interval
      let currentDueDate = series.nextDueDate
        ? dayjs(series.nextDueDate)
        : dayjs(series.startDate).add(series.interval * lastInstallmentIndex, series.unit);

      let nextIndex = lastInstallmentIndex + 1;

      while (true) {
        // Stop if currentDueDate is after today or past endDate
        if (currentDueDate.isAfter(today.endOf('day'))) break;
        if (seriesEndDate && currentDueDate.isAfter(seriesEndDate)) break;
        if (series.totalOccurrences && nextIndex > series.totalOccurrences) break;

        const dueDateIso = currentDueDate.toISOString();

        // Prevent duplicate expenses
        const existing = await tx.expenses
          .where('[seriesId+installmentIndex]')
          .equals([series.seriesId, nextIndex])
          .first();

        if (!existing) {
          let seriesAmountDefault = series.amountDefault;

          if(series.amountAlt > 0) {
            //console.log("Expense in alternative currency");
            const rate = await getExchangeRateDirect(series.currencyCode); // ✅ async-safe

            if (rate) {
              seriesAmountDefault = Math.round(series.amountAlt / rate);
              //console.log("Amount default updated with new rate");
            }
          }

          // Use the 'shouldLogAutomatically' variable to set autoLogged and isActive
          await tx.expenses.add({
            userId: series.userId,
            dueDate: dueDateIso,
            expenseDate: dueDateIso, 
            expenseNote: series.note,
            accountId: series.accountId,
            categoryId: series.categoryId,
            subcategoryId: series.subcategoryId,
            expenseAmountDefault: seriesAmountDefault, 
            expenseAmountTrip: 0,
            expenseAmountAlt: series.amountAlt,
            expenseCurrencyCode: series.currencyCode,
            expenseLocale: series.locale || 'en-US',
            tripId: null,
            seriesId: series.seriesId,
            installmentIndex: nextIndex,
            totalInstallments: series.totalOccurrences ?? undefined,
            // This is the core change for the expense record:
            autoLogged: shouldLogAutomatically ? true : false,
            isActive: shouldLogAutomatically ? 1 : 0, 
          });
          //console.log("installment index: ", nextIndex);

          // Calculate next due date relative to startDate, not currentDueDate
          const nextInstallmentDate = dayjs(series.startDate).add(
            series.interval * nextIndex,
            series.unit
          );
          let nextInstallmentIso: string | null = null;
          let activeStatus = 1;

          if (
            (!seriesEndDate || nextInstallmentDate.isSameOrBefore(seriesEndDate)) &&
            (!series.totalOccurrences || nextIndex + 1 <= series.totalOccurrences)
          ) {
            nextInstallmentIso = nextInstallmentDate.toISOString();
            //console.log("Next installment iso: ", nextInstallmentIso);
          } else {
            nextInstallmentIso = null;
            const hasOverdue = await getOldestOverdueExpenseForSeries(series.seriesId);
            // activeStatus is 2 (Overdue) if there are still expenses to log/clear, 0 (Finished) otherwise
            activeStatus = hasOverdue ? 2 : 0;
          }

          const updateData: any = {
            lastLoggedInstallmentIndex: nextIndex,
            originalNextDueDate: nextInstallmentIso,
            nextDueDate: nextInstallmentIso,
            isActive: activeStatus,
            amountDefault: series.estimatedAmount > 0 ? 0 : series.amountDefault,
            amountAlt: series.estimatedAmount > 0 ? 0 : series.amountAlt 
          };

          // Use 'shouldLogAutomatically' for updating the series
          if (shouldLogAutomatically) {
            updateData.lastLoggedDate = dueDateIso;
          } else if (!shouldLogAutomatically && nextInstallmentDate.isSameOrAfter(seriesEndDate)) {
            // This is the original logic for non-auto-logged series reaching the end, 
            // but we must check if it's still active due to overdue expenses
            if (activeStatus !== 2) {
                updateData.isActive = 0; // Set to 0 (Finished) only if no more installments AND no overdue expenses
            }
          }
          
          await tx.recurringSeries.update(series.seriesId, updateData);
          //console.log("3. Added new recurring expense, installment #", nextIndex);
          hasChanges = true;
        }

        // Move to next date/index
        currentDueDate = currentDueDate.add(series.interval, series.unit);
        nextIndex++;
      }
    }
  });

  return hasChanges;
};



