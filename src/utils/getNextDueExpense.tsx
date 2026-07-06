import { db, Expense } from '../db';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
/*
export const getNextDueExpense = async (seriesId: number): Promise<Expense | null> => {
    const series = await db.recurringSeries
      .where('seriesId')
      .equals(seriesId)
      .first();

  
    if (!series) {
      throw new Error(`Series with ID ${seriesId} not found`);
    }
  
    if (!series.nextDueDate) {
      return null; // No next due date
    }
  
    const nextDue = dayjs(series.nextDueDate);
    const today = dayjs().startOf('day');
  

    return {
      expenseId: -1,
      userId: series.userId,
      dueDate: nextDue.toISOString(),
      expenseDate: '',
      expenseNote: series.note,
      accountId: series.accountId,
      categoryId: series.categoryId,
      subcategoryId: series.subcategoryId,
      expenseAmountDefault: series.amountDefault,
      expenseAmountAlt: series.amountAlt,
      expenseAmountTrip: 0,
      expenseCurrencyCode: series.currencyCode,
      expenseLocale: series.locale || 'en-US',
      tripId: null,
      seriesId: series.seriesId,
      installmentIndex: series.lastLoggedInstallmentIndex + 1, // ✅ next one
      totalInstallments: series.totalOccurrences ?? undefined,
      isActive: series.isActive,
    };
  };
  */