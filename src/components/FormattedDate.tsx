import React from 'react';
import { useTranslation } from 'react-i18next';

type DateFormatType =
  | 'long'          // June 25, 2025
  | 'short'         // 6/25/2025
  | 'full'          // Wednesday, Jun 25, 2025
  | 'fullNoYear'    // Wednesday, Jun 25
  | 'compact'       // 06/25/25
  | 'dayMonth'      // 25 Jun
  | 'dateTimeShort' // Jun 25, 2025, 4:27 PM
  | 'dateTime24h'   // 25/06/2025, 16:27
  | 'monthYear'     // July 2025
  | 'yearOnly'      // 2025
  | 'weekdayShort'  // Wed
  | 'monthDay';     // 09/27 (locale-aware)

interface Props { 
  date?: Date;
  from?: Date;
  to?: Date;
  format?: DateFormatType;
  prefix?: string;
  showRangeDash?: boolean;
}

const formatOptionsMap: Record<DateFormatType, Intl.DateTimeFormatOptions> = {
  long: { year: 'numeric', month: 'long', day: 'numeric' },
  short: { year: 'numeric', month: 'numeric', day: 'numeric' },
  full: { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' },
  fullNoYear: { weekday: 'long', month: 'long', day: 'numeric' },
  compact: { year: '2-digit', month: '2-digit', day: '2-digit' },
  dayMonth: { day: 'numeric', month: 'short' },
  dateTimeShort: {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  },
  dateTime24h: {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }, 
  monthYear: { year: 'numeric', month: 'long' },
  yearOnly: { year: 'numeric' },
  weekdayShort: { weekday: 'short' },
  monthDay: { month: '2-digit', day: '2-digit' }, // ✅ locale-aware
};

const isValidDate = (d: unknown): d is Date =>
  d instanceof Date && !isNaN(d.getTime());

const formatDate = (
  date: Date,
  locale: string,
  formatType: DateFormatType = 'long'
): string => {
  if (!isValidDate(date)) {
    console.warn('Invalid date passed to formatDate:', date);
    return '';
  }

  const options = formatOptionsMap[formatType];
  const formatter = new Intl.DateTimeFormat(locale, options);
  return formatter.format(date);
};

const FormattedDate: React.FC<Props> = ({
  date,
  from,
  to,
  format = 'long',
  prefix = '',
  showRangeDash = true,
}) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;

  if (!locale || typeof locale !== 'string') return null;

  const renderDate = () => {
    if (isValidDate(date)) {
      return formatDate(date, locale, format);
    } else if (isValidDate(from) && isValidDate(to)) {
      const fromStr = formatDate(from, locale, format);
      const toStr = formatDate(to, locale, format);
      return `${fromStr}${showRangeDash ? ' – ' : ' '}${toStr}`;
    } else if (isValidDate(from)) {
      return `${t("date.from")} ${formatDate(from, locale, format)}`;
    } else if (isValidDate(to)) {
      return `${t("date.until")} ${formatDate(to, locale, format)}`;
    }

    return '';
  };

  return (
    <>
      {prefix && <span className="prefix">{prefix}</span>}
      {renderDate()}
    </>
  );
};

export default FormattedDate;
