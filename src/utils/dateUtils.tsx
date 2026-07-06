import { Dayjs } from "dayjs";

/**
 * Returns the first day of the week containing the given date,
 * based on the user's preferred week start day.
 *
 * Day.js `.startOf('week')` relies on the current locale, which is
 * not suitable when the app allows users to explicitly choose between
 * Sunday and Monday as the first day of the week.
 *
 * Examples:
 * - Sunday start:
 *   Sun Mon Tue Wed Thu Fri Sat
 *    ^ returned for any day in that week
 *
 * - Monday start:
 *   Mon Tue Wed Thu Fri Sat Sun
 *    ^ returned for any day in that week
 *
 * This helper should be used whenever calculating:
 * - calendar grids
 * - weekly intervals
 * - planner ranges
 * - reporting periods
 *
 * so that week calculations remain consistent throughout the app,
 * regardless of locale settings.
 */
export function getWeekStart(
  date: Dayjs,
  weekStartDay: 'sunday' | 'monday'
): Dayjs {
  return weekStartDay === 'sunday'
    ? date.subtract(date.day(), 'day')
    : date.subtract((date.day() + 6) % 7, 'day');
}


/**
 * Returns the last day of the week containing the given date,
 * based on the user's preferred week start day.
 *
 * This is the counterpart to `getWeekStart()` and should be used
 * whenever a weekly range is required.
 *
 * The returned date is always 6 days after the calculated week start.
 */
export function getWeekEnd(
  date: Dayjs,
  weekStartDay: 'sunday' | 'monday'
): Dayjs {
  return getWeekStart(date, weekStartDay).add(6, 'day');
}