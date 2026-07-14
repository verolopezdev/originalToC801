import { db, Expense } from '../db'; 
import dayjs from 'dayjs'; // date manipulation library and plugins
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

// Adds the comparison plugins to dayjs so you can use methods like isSameOrAfter().
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

export const getAllExpenses = async (startDate: string, endDate: string): Promise<Expense[]> => {
  const startOfMonth = dayjs(startDate);
  const endOfMonth = dayjs(endDate);

  // 1. Get all existing expenses in this month
  const expenses = await db.expenses
    .where("expenseDate")
    .between(startOfMonth.toISOString(), endOfMonth.toISOString(), true, true)
    .toArray();

  // 2. Get all active recurring series
  const recurringSeries = await db.recurringSeries  
    .filter(series => series.isActive === 1)
    .toArray();

  // 3. Generate upcoming occurrences for this month
  const generatedExpenses: Expense[] = [];

  for (const series of recurringSeries) {
    let occurrenceDate = dayjs(series.nextDueDate);
    let occurrenceCount = series.lastLoggedInstallmentIndex;
    const seriesEndDate = series.endDate ? dayjs(series.endDate) : null;

    while (
      occurrenceDate.isBefore(endOfMonth.add(1, 'day')) &&
      (!series.totalOccurrences || occurrenceCount < series.totalOccurrences) &&
      (!seriesEndDate || occurrenceDate.isSameOrBefore(seriesEndDate, 'day'))
    ) {
      const installmentIndex = occurrenceCount + 1;

      // Check if this occurrence was moved
      let effectiveDate = occurrenceDate;
      if (series.moved && series.moved[installmentIndex]) { // If moved[installmentIndex] exists, the occurrence uses the moved date
        effectiveDate = dayjs(series.moved[installmentIndex]);
      }

      // Only push if the effective date falls in the range
      // If the moved date is in the current range, it gets added.
      // If the moved date is outside the current range, it is ignored.
      if (
        effectiveDate.isSameOrAfter(startOfMonth) &&
        effectiveDate.isSameOrBefore(endOfMonth)
      ) {
        generatedExpenses.push({
          expenseId: '-1',
          userId: series.userId,
          expenseDate: effectiveDate.toISOString(), // use moved date if available
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
          isActive: 0
        });
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
  }

  // 4. Merge and sort by date
  // Create a Set of existing recurring composite keys
  const existingKeys = new Set(
    expenses
      .filter(e => e.seriesId !== undefined && e.installmentIndex !== undefined) // filter the original expenses list to only include those that are part of a recurring series
      .map(e => `${e.seriesId}-${e.installmentIndex}`) // This key combines the seriesId and installmentIndex, which together identify a single occurrence in a recurring series.
  );

  // Filter out generated duplicates
  /*
  For each generated expense, we build the same composite key (seriesId-installmentIndex).
  We check if this key exists in the existingKeys set:
  If it does, it means this expense has already been manually created/stored — so we skip it.
  If it does not, we keep the generated expense.
  */
  const filteredGenerated = generatedExpenses.filter(
    exp => !existingKeys.has(`${exp.seriesId}-${exp.installmentIndex}`)
  );

  // Merge and sort by date: We merge the two arrays: expenses (original ones from the database) and filteredGenerated (new ones that aren’t duplicates).
  const allExpenses = [...expenses, ...filteredGenerated].sort((a, b) =>
    dayjs(a.expenseDate).diff(dayjs(b.expenseDate))
  );

  return allExpenses;

};