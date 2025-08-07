import { type Holiday } from "@shared/schema";

/**
 * Check if a given date is a holiday, considering both exact dates and recurring holidays
 */
export function isHolidayDate(date: Date, holidays: Holiday[]): boolean {
  const checkMonthDay = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  
  return holidays.some(holiday => {
    const holidayDate = new Date(holiday.date);
    
    // Check exact date match
    if (holidayDate.toDateString() === date.toDateString()) {
      return true;
    }
    
    // Check recurring holiday (same month-day but any year)
    if (holiday.isRecurring && holiday.monthDay === checkMonthDay) {
      return true;
    }
    
    return false;
  });
}

/**
 * Get all holidays for a specific year, including recurring holidays
 */
export function getHolidaysForYear(year: number, holidays: Holiday[]): Holiday[] {
  const result: Holiday[] = [];
  
  holidays.forEach(holiday => {
    const holidayDate = new Date(holiday.date);
    
    // Add exact date if it's in the target year
    if (holidayDate.getFullYear() === year) {
      result.push(holiday);
    }
    
    // Add recurring holiday for the target year if different from original year
    if (holiday.isRecurring && holidayDate.getFullYear() !== year && holiday.monthDay) {
      const [month, day] = holiday.monthDay.split('-').map(Number);
      const recurringDate = new Date(year, month - 1, day);
      
      // Create virtual holiday entry for the recurring date
      result.push({
        ...holiday,
        id: `${holiday.id}-${year}`, // Virtual ID for recurring instance
        date: recurringDate,
      });
    }
  });
  
  return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * Get all holiday dates for a date range, including recurring holidays
 */
export function getHolidayDatesInRange(startDate: Date, endDate: Date, holidays: Holiday[]): Date[] {
  const result: Date[] = [];
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();
  
  // Check each year in the range
  for (let year = startYear; year <= endYear; year++) {
    const yearHolidays = getHolidaysForYear(year, holidays);
    
    yearHolidays.forEach(holiday => {
      const holidayDate = new Date(holiday.date);
      
      // Only include if within the date range
      if (holidayDate >= startDate && holidayDate <= endDate) {
        result.push(holidayDate);
      }
    });
  }
  
  return result;
}