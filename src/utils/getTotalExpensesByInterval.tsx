import dayjs, { Dayjs } from "dayjs";
import { db } from "../db";
import { getDateRangeForInterval } from "../utils/getDateRangeForInterval";


export async function getTotalExpensesByInterval(
  interval: "weekly" | "monthly" | "yearly",
  currentDate: Dayjs,
  onlyUntilToday = false, // used in DashboardMainCard
  accountId?: string,
) {
  const { start, end } = getDateRangeForInterval(
    interval,
    currentDate,
    onlyUntilToday,
  );

  let query = db.expenses
    .where("expenseDate")
    .between(start.toISOString(), end.toISOString(), true, true)
    .filter(expense => expense.isActive === 1);

  if (accountId !== undefined) {
    query = query.and(expense => expense.accountId === accountId);
  }

  const records = await query.toArray();

  const total = records.reduce(
    (sum, record) => sum + (record.expenseAmountDefault || 0),
    0
  );

  return Math.round(total);
}


export async function getTotalExpensesForPeriod(
  start: Dayjs,
  end: Dayjs,
  accountId?: string,
) {
   

  let query = db.expenses
    .where("expenseDate")
    .between(start.toISOString(), end.toISOString(), true, true)
    .filter(expense => expense.isActive === 1);

  if (accountId !== undefined) {
    query = query.and(expense => expense.accountId === accountId);
  }

  const records = await query.toArray();

  const total = records.reduce(
    (sum, record) => sum + (record.expenseAmountDefault || 0),
    0
  );

  return Math.round(total);
}
