import { db } from '../db';
import dayjs from 'dayjs';

export type Severity = 'none' | 'due-today' | 'due-soon' | 'due-later' | 'overdue' | 'finalized';

/**
 * Check overall severity for all expenses and recurrences (dashboard).
 */
export async function getOverallStatus(): Promise<Severity> { 
	//console.log("START OVERALL STATUS FX ---");
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(todayStart.getDate() + 1);


	// 1️⃣ Overdue check (strictly before today)
  const hasOverdue = await db.expenses
    .where('isActive')
    .equals(0)
    .and(exp => {
      if (!exp.dueDate) return false;
      const due = new Date(exp.dueDate);
      return due < todayStart; // strictly before today
    })
    .first();
  if (hasOverdue !== undefined) {
    return 'overdue';
  }


  // 2️⃣ Due today check (within today's range)
  const hasDueToday = await db.expenses
    .where('isActive')
    .equals(0)
    .and(exp => {
      if (!exp.dueDate) return false;
      const due = new Date(exp.dueDate);
      return due >= todayStart && due < tomorrowStart;
    })
    .first();
  if (hasDueToday !== undefined) {
    return 'due-today';
  }


	// Get due-soon from recurringSeries if available
  const hasDueSoon = await db.recurringSeries
    .where('isActive')
    .equals(1)
    .and(exp => {
      if (!exp.nextDueDate) return false;
      const dueDate = new Date(exp.nextDueDate);
      const diffDays = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= 7 && diffDays >= 0;
    })
    .first();
	if (hasDueSoon !== undefined){
    //console.log("Has due soon: ", hasDueSoon);
    return 'due-soon';
  } 

	// Get due-later from recurringSeries if available
  const hasDueLater = await db.recurringSeries
    .where('isActive')
    .equals(1)
    .first();
	if (hasDueLater !== undefined){
    //console.log("Has due later: ", hasDueLater);
    return 'due-later';
  } 

  return 'finalized';
}


/**
 * Compute the current severity for a series.
 * Returns 'overdue', 'due-today', 'due-soon', 'due-later', or 'finalized'
 * Called from ViewRecurrence
 */
export async function getSeriesSeverity(seriesId: number) {
  const now = dayjs();
  const todayStart = now.startOf('day');

  // 1️⃣ Check past expenses for this series
  const pastExpense = await db.expenses
    .where('seriesId')
    .equals(seriesId)
    .reverse()
    .first();
console.log("Past expense: ", pastExpense);
  if (pastExpense) {
    const due = dayjs(pastExpense.dueDate).startOf('day');

    if (due.isBefore(todayStart) && pastExpense.isActive === 3) return 'overdue';
    if (due.isSame(todayStart)) return 'due-today';
  }

// 2️⃣ Check future scheduled occurrences
const series = await db.recurringSeries.get(seriesId);
  if (!series || !series.isActive || !series.nextDueDate) return 'finalized';

  const nextDue = dayjs(series.nextDueDate);
  const diffDays = nextDue.diff(now, 'day');

  if (diffDays >= 0 && diffDays <= 7) return 'due-soon';
  if (diffDays > 7) return 'due-later';

  return 'finalized';
}



export async function hasInactiveExpense(seriesId: number): Promise<boolean> {
  if (!seriesId) {
    console.warn("[hasInactiveExpense] No seriesId provided.");
    return false;
  }

  try {
    const result = await db.expenses
      .where({ seriesId, isActive: 0 })
      .first();

    return !!result; // true if found, false otherwise
  } catch (error) {
    console.error("[hasInactiveExpense] Failed to check expenses:", error);
    return false;
  }
}