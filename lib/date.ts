import {
  format,
  startOfDay,
  endOfDay,
  subDays,
  isValid,
  parseISO,
  addDays,
  isSameDay,
  isToday as dateFnsIsToday,
  differenceInDays,
} from "date-fns"
import { es } from "date-fns/locale"

/**
 * Get the start of day for a given date
 */
export function getStartOfDay(date: Date = new Date()): Date {
  return startOfDay(date)
}

/**
 * Get the end of day for a given date
 */
export function getEndOfDay(date: Date = new Date()): Date {
  return endOfDay(date)
}

/**
 * Get today's date range (start and end of today)
 */
export function getTodayRange(): { start: Date; end: Date } {
  const today = new Date()
  return {
    start: getStartOfDay(today),
    end: getEndOfDay(today),
  }
}

/**
 * Get date range for the last N days
 */
export function getDateRange(days: number): { start: Date; end: Date } {
  const end = new Date()
  const start = subDays(end, days)

  return {
    start: getStartOfDay(start),
    end: getEndOfDay(end),
  }
}

/**
 * Format date for display (DD/MM/YYYY)
 */
export function formatDate(date: Date | string): string {
  const dateObj = typeof date === "string" ? parseISO(date) : date
  if (!isValid(dateObj)) return "Fecha inválida"
  return format(dateObj, "dd/MM/yyyy", { locale: es })
}

/**
 * Format date and time for display (DD/MM/YYYY HH:mm)
 */
export function formatDateTime(date: Date | string): string {
  const dateObj = typeof date === "string" ? parseISO(date) : date
  if (!isValid(dateObj)) return "Fecha inválida"
  return format(dateObj, "dd/MM/yyyy HH:mm", { locale: es })
}

/**
 * Format date for HTML input (YYYY-MM-DD)
 */
export function formatDateForInput(date: Date): string {
  if (!isValid(date)) return ""
  return format(date, "yyyy-MM-dd")
}

/**
 * Parse date from HTML input string
 */
export function parseDateFromInput(dateString: string): Date | null {
  if (!dateString) return null
  const parsed = parseISO(dateString)
  return isValid(parsed) ? parsed : null
}

/**
 * Format date in long format (e.g., "Lunes, 15 de enero de 2024")
 */
export function formatDateLong(date: Date | string): string {
  const dateObj = typeof date === "string" ? parseISO(date) : date
  if (!isValid(dateObj)) return "Fecha inválida"
  return format(dateObj, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: es })
}

/**
 * Format date in short format (DD/MM/YY)
 */
export function formatDateShort(date: Date | string): string {
  const dateObj = typeof date === "string" ? parseISO(date) : date
  if (!isValid(dateObj)) return "Fecha inválida"
  return format(dateObj, "dd/MM/yy", { locale: es })
}

/**
 * Check if a date is today
 */
export function isToday(date: Date | string): boolean {
  const dateObj = typeof date === "string" ? parseISO(date) : date
  if (!isValid(dateObj)) return false
  return dateFnsIsToday(dateObj)
}

/**
 * Get date N days ago
 */
export function getDaysAgo(days: number): Date {
  return subDays(new Date(), days)
}

/**
 * Add days to a date
 */
export function addDaysToDate(date: Date, days: number): Date {
  return addDays(date, days)
}

/**
 * Check if two dates are the same day
 */
export function isSameDate(date1: Date | string, date2: Date | string): boolean {
  const dateObj1 = typeof date1 === "string" ? parseISO(date1) : date1
  const dateObj2 = typeof date2 === "string" ? parseISO(date2) : date2

  if (!isValid(dateObj1) || !isValid(dateObj2)) return false
  return isSameDay(dateObj1, dateObj2)
}

/**
 * Get difference in days between two dates
 */
export function getDaysDifference(date1: Date | string, date2: Date | string): number {
  const dateObj1 = typeof date1 === "string" ? parseISO(date1) : date1
  const dateObj2 = typeof date2 === "string" ? parseISO(date2) : date2

  if (!isValid(dateObj1) || !isValid(dateObj2)) return 0
  return differenceInDays(dateObj1, dateObj2)
}

/**
 * Validate if a string is a valid date
 */
export function isValidDateString(dateString: string): boolean {
  const parsed = parseISO(dateString)
  return isValid(parsed)
}

/**
 * Get current timestamp in ISO format
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString()
}

/**
 * Format date for API requests (ISO string)
 */
export function formatDateForAPI(date: Date): string {
  return date.toISOString()
}
