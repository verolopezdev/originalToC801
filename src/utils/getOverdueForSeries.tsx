import { db, Expense } from '../db';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
/*
export const getOverdueForSeries = async (seriesId: number): Promise<Expense[]> => {
  // 1. Get all existing expenses for this series (active or deleted)
  const expenses = await db.expenses
    .where("seriesId")
    .equals(seriesId)
    .and(exp => exp.isActive === 1 || exp.isActive === 2)
    .toArray();

  // 2. Get the recurring series
  const series = await db.recurringSeries
    .where("seriesId")
    .equals(seriesId)
    .first();

  if (!series) {
    throw new Error(`Series with ID ${seriesId} not found`);
  }

  const today = dayjs().endOf('day'); // include today
  const generatedExpenses: Expense[] = [];
  let occurrenceDate = dayjs(series.startDate);
  let occurrenceCount = 0;
  const seriesEndDate = series.endDate ? dayjs(series.endDate) : null;

  while (
    (!series.totalOccurrences || occurrenceCount < series.totalOccurrences) &&
    (!seriesEndDate || occurrenceDate.isSameOrBefore(seriesEndDate, 'day'))
  ) {
    const installmentIndex = occurrenceCount + 1;

    // Check moved occurrence
    let effectiveDate = occurrenceDate;
    if (series.moved && series.moved[installmentIndex]) {
      effectiveDate = dayjs(series.moved[installmentIndex]);
    }

    // ✅ Only push if effectiveDate is overdue (<= today)
    if (effectiveDate.isSameOrBefore(today, 'day')) {
      generatedExpenses.push({
        expenseId: -1,
        userId: series.userId,
				dueDate: effectiveDate.toISOString(),
        expenseDate: '',
        expenseNote: series.note,
        accountId: series.accountId,
        categoryId: series.categoryId,
        subcategoryId: series.subcategoryId,
        expenseAmountDefault: series.amountDefault,
        expenseAmountAlt: series.amountAlt,
        expenseAmountTrip: 0,
        expenseCurrencyCode: series.currencyCode,
        expenseLocale: 'en-US',
        tripId: null,
        seriesId: series.seriesId,
        installmentIndex,
        totalInstallments: series.totalOccurrences ?? undefined,
        isActive: series.isActive,
      });
    }

    // If next occurrence would be after today, break early (optimization)
    if (occurrenceDate.isAfter(today, 'day')) {
      break;
    }

    occurrenceCount++;

    switch (series.unit) {
      case 'week':
        occurrenceDate = occurrenceDate.add(series.interval, 'week');
        break;
      case 'month':
        occurrenceDate = occurrenceDate.add(series.interval, 'month');
        break;
      case 'year':
        occurrenceDate = occurrenceDate.add(series.interval, 'year');
        break;
    }
  }

  // Remove ones already logged
  const existingKeys = new Set(
    expenses
      .filter(e => e.seriesId !== undefined && e.installmentIndex !== undefined)
      .map(e => `${e.seriesId}-${e.installmentIndex}`)
  );

  const filteredGenerated = generatedExpenses.filter(
    exp => !existingKeys.has(`${exp.seriesId}-${exp.installmentIndex}`)
  );

  // Sort by date ascending (oldest overdue first)
  const overdueExpenses = filteredGenerated.sort((a, b) =>
    dayjs(a.expenseDate).diff(dayjs(b.expenseDate))
  );

  return overdueExpenses;
};
*/