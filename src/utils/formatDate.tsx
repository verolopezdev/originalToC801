/*
Helper function to format dates based on the current language/locale
 
const shortDate = formatDate(new Date(), 'short'); // → "13/3/2025" (depending on locale)
const longDate = formatDate(new Date(), 'long'); // → "March 13, 2025"
const fullDate = formatDate(new Date(), 'full'); // → "Thursday, Mar 13, 2025"
const fullNoYearDate = formatDate(new Date(), 'fullNoYear'); // → "Thursday, Mar 13"
const compactDate = formatDate(new Date(), 'compact'); // 13/3/25
*/

type DateFormatType = 'long' | 'short' | 'full' | 'compact' | 'dayMonth' | 'fullNoYear' | 'monthYear' | 'yearOnly'| 'weekdayShort';

// Map format types to Intl.DateTimeFormatOptions
const formatOptionsMap: Record<DateFormatType, Intl.DateTimeFormatOptions> = {
  long: {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  },
  short: {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  },
  full: {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  },
  compact: {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
  },
  dayMonth: {
    day: 'numeric',
    month: 'short',
  },
  fullNoYear: {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  },
  monthYear: { 
    year: 'numeric', 
    month: 'long' 
  },  // ✅ "July 2025"
  yearOnly: { 
    year: 'numeric' 
  },                  // ✅ "2025" 
  weekdayShort: {
    weekday: 'short', // → "Mon", "Tue", etc.
  },

};



// Main formatDate function
export const formatDate = ( 
  date: Date,
  locale: string,
  formatType: DateFormatType = 'long'
): string => {
  const currentLocale = locale;
  const options = formatOptionsMap[formatType];
  const formatter = new Intl.DateTimeFormat(currentLocale, options);
  return formatter.format(date);
};



export const getDaysBetween = (date1: Date, date2: Date): number => {
  const oneDayMs = 1000 * 60 * 60 * 24; // milliseconds in one day

  // Clear the time part to compare only dates
  const start = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const end = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());

  const diffInMs = end.getTime() - start.getTime();
  return Math.round(diffInMs / oneDayMs) + 1; // Include both dates
};



export const getWeekdayNames = (locale: string = 'en-US'): string[] => {
  const formatter = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    timeZone: 'UTC', // Ensure consistent day names regardless of local time
  });

  const baseDate = new Date(Date.UTC(2021, 5, 6)); // Sunday, June 6, 2021
  const weekdays = [...Array(7)].map((_, i) => {
    const date = new Date(baseDate);
    date.setUTCDate(baseDate.getUTCDate() + i);
    return formatter.format(date);
  });

  return weekdays;
};
