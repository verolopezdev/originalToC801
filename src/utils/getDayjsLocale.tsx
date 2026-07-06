/**
 * Converts an application locale (e.g. "es-AR", "en-US", "pt-BR")
 * into the base locale code expected by Day.js ("es", "en", "pt").
 *
 * The app stores full regional locales for currency, number and date
 * formatting, but Day.js only loads the base language locales imported
 * in the project. This helper ensures we always use a valid Day.js locale
 * and provides a safe fallback when the locale is not yet available.
 *
 * Examples:
 *   es-AR -> es
 *   es-ES -> es
 *   pt-BR -> pt
 *   en-US -> en
 *
 * Fallback:
 *   null/undefined -> en (US default)
 */
export const getDayjsLocale = (locale?: string | null): string =>
  (locale ?? 'en-US').split('-')[0];