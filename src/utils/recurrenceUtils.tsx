import { db, RecurringSeries } from '../db';


import dayjs from "dayjs";

type Unit = "week" | "month" | "year";

interface DateRange {
  min: Date;
  max: Date;
}

// this function is basically centering a window around baseDate, but excluding the exact boundaries.
// used for recurring series with autolog to keep integrity
// due dates: 10/1, 10/2, 10/3. for 10/2: min 11/1 - max 9/3
export function getDateRange(
  baseDate: Date | undefined,
  unit: Unit,
  interval: number
): DateRange {
  const base = dayjs(baseDate);

  const min = base.subtract(interval, unit).add(1, "day").startOf("day").toDate();
  const max = base.add(interval, unit).subtract(1, "day").startOf("day").toDate();

  return { min, max };
}

export function getNextDate(
    base: Date,
    unit: string,
    interval: number,
    offset: number
  ): Date {
    const d = new Date(base);
    if (unit === 'day') d.setDate(d.getDate() + interval * offset);
    else if (unit === 'week') d.setDate(d.getDate() + 7 * interval * offset);
    else if (unit === 'month') d.setMonth(d.getMonth() + interval * offset);
    else if (unit === 'year') d.setFullYear(d.getFullYear() + interval * offset);
    return d;
  }
  
  export function calculateOccurrencesUntilDate(
    start: Date,
    recurrence: {
      unit: string;
      interval: number;
      endDate?: string;
    }
  ): number {
    if (!recurrence.endDate) return 0;
    const end = new Date(recurrence.endDate);
    let count = 0;
    let current = new Date(start);
  
    while (current <= end) {
      count++;
      current = getNextDate(start, recurrence.unit, recurrence.interval, count);
    }
  
    return count;
  } 


  export async function getRecurringSeriesById(seriesId: string): Promise<RecurringSeries | undefined> {
    return await db.recurringSeries.get(seriesId);
  }
  