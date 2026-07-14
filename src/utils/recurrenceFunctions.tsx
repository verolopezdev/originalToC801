import { db, Expense } from '../db'; // adjust path to your db instance
import Dexie from "dexie";
import { RecurringSeries } from '../db'; // adjust to your interface location
import dayjs from 'dayjs';
import i18n from '../i18n';




export const isBeforeToday = (dateString: string | null | undefined): boolean => {
  if (!dateString) return false; // No end date means no restriction
  return dayjs(dateString).isBefore(dayjs().startOf('day'));
};


export const isBeforeOrToday = (dateString: string | null | undefined): boolean => {
  if (!dateString) return false;
  return !dayjs(dateString).isAfter(dayjs().startOf('day'), 'day');
};

/*
 * Returns all active recurring series ordered by lastUpdatedDate (descending).
 */
export const getActiveRecurringSeries = async (): Promise<RecurringSeries[]> => {
  return await db.recurringSeries
    .where('isActive')
    .notEqual(0)
    .sortBy('lastLoggedDate');    
};


/*
 * Returns all inactive recurring series ordered by lastUpdatedDate (descending).
 */
export const getInactiveRecurringSeries = async (): Promise<RecurringSeries[]> => {
	return await db.recurringSeries
		.where('isActive')
		.equals(0) // or false, depending on how you store booleans
		.sortBy('lastUpdatedDate')
		.then(list => list.reverse()); // sortBy returns ascending, so reverse for descending
};


/**
 * Returns the next due date for a given recurring series, or null if it’s finished.
 */
export const getNextDueDate = (
  series: RecurringSeries,
  overrideLastLoggedDate?: string
): string | null => {
  //const effectiveLastLoggedDate = overrideLastLoggedDate ?? series.originalDueDate;
  const effectiveLastLoggedDate = series.originalNextDueDate;


  // If the series hasn't started yet
  if (!effectiveLastLoggedDate) {
    return series.startDate;
  }

  // If totalOccurrences is defined, check if we've reached the end
  if (
    series.totalOccurrences !== null &&
    series.lastLoggedInstallmentIndex >= series.totalOccurrences
  ) {
    return null; // No more due dates
  }

  // Calculate next date
  const nextDate = dayjs(effectiveLastLoggedDate).add(series.interval, series.unit);

  // If endDate is set, ensure we don't go past it
  if (series.endDate) {
    const end = dayjs(series.endDate).endOf("day");
    if (nextDate.isAfter(end)) {
      return null; // Past end date, stop recurrence
    }
  }

  return nextDate.toISOString();
};


/*
 * Returns the earliest due status from all active recurrencies to color dot in recurrences icon in dashboard
 
export const getEarliestStatus = (
  seriesList: RecurringSeries[]
): 'overdue'| 'due-today' | 'due-soon' | 'due-later' | 'no-due-date' => {
  const activeWithDueDates = seriesList.filter(s => s.isActive === 1 && s.nextDueDate !== null);

	if (activeWithDueDates.length === 0) {
    return 'no-due-date';
  }

  const earliestDue = activeWithDueDates.reduce((earliest, current) => {
    const earliestDate = dayjs(earliest.nextDueDate!);
    const currentDate = dayjs(current.nextDueDate!);
    return currentDate.isBefore(earliestDate) ? current : earliest;
  });

  const today = dayjs().startOf('day');
  const dueDate = dayjs(earliestDue.nextDueDate!).startOf('day');

  if (dueDate.isBefore(today)) return 'overdue';
  if (dueDate.isSame(today)) return 'due-today';

  const daysDiff = dueDate.diff(today, 'day');
  if (daysDiff === 0) return 'due-today';
  if (daysDiff > 0 && daysDiff <= 7) return 'due-soon';
  if (daysDiff > 7) return 'due-later';

  return 'no-due-date';
};
*/

/*
Function name: getDueInfo
Input: An optional string or null called nextDueDate which should represent a date (e.g., "2025-08-09").
Output: An object with two properties:
label: a string describing the due status (like "Due today", "Overdue by 3 days", etc.)
className: a string CSS class name that you can use for styling the status visually.
*/
export type DueInfo = {
  label: string;
  className: string;
};

export const getDueInfo = ( 
  nextDueDate?: string | null 
): DueInfo => {
  if (!nextDueDate) {
    // Treat as finalized
    return { label: i18n.t('utils.finalized'), className: 'finalized' };  
  }

  const today = dayjs().startOf('day');
  const due = dayjs(nextDueDate).startOf('day');
  const diffDays = due.diff(today, 'day');

  if (diffDays < 0) {
    const daysOverdue = Math.abs(diffDays);
    return {
      label: i18n.t('utils.overdue', { count: daysOverdue }),
      className: 'overdue',
    };
  }

  if (diffDays == 0) {
    return { label: i18n.t('utils.due_today'), className: 'due-today' };
  }


  if (diffDays <= 7) {
    return { label: i18n.t('utils.due_in', { count: diffDays }), className: 'due-soon' };
  }

  return { label: i18n.t('utils.due_in', { count: diffDays }), className: 'due-later' };
};





// Called from Recurrences.tsx and ViewRecurrence.tsx
export const getOldestOverdueExpenseForSeries = async (   
  seriesId: string
): Promise<Expense | null> => {
  const todayISO = dayjs().endOf('day').toISOString();

  const oldestOverdue = await db.expenses
    .where('[seriesId+isActive+dueDate]') 
    .between([seriesId, 0, ''], [seriesId, 0, todayISO])  
    .first();

  return oldestOverdue || null;
};




export const getMostRecentExpenseForSeries = async (seriesId: string): Promise<Expense | undefined> => {
  return await db.expenses
    .where('[seriesId+expenseDate]') // compound index recommended
    .between([seriesId, Dexie.minKey], [seriesId, Dexie.maxKey])
    .reverse() // newest first
    .first(); // just get first one (fast!)
};



export const hasRecurrenceEnded = (
  recurrence: RecurringSeries
): boolean => {
  // Already inactive
  if (!recurrence.isActive) {
    return false;
  }

  // Finished by number of occurrences
  if (
    recurrence.totalOccurrences !== null &&
    recurrence.lastLoggedInstallmentIndex >= recurrence.totalOccurrences
  ) {
    return true;
  }

  // Finished by end date
  if (recurrence.endDate && recurrence.nextDueDate) {
    const endDate = new Date(recurrence.endDate);
    const nextDueDate = new Date(recurrence.nextDueDate);

    if (
      !isNaN(endDate.getTime()) &&
      !isNaN(nextDueDate.getTime()) &&
      nextDueDate > endDate
    ) {
      return true;
    }
  }

  return false;
};