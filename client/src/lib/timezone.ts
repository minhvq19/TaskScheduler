// Timezone utilities for handling local vs internet environment differences
// Safe conditional logic that doesn't affect internet deployment

export interface TimeConfig {
  isOfflineMode: boolean;
  timezoneOffset: number; // hours offset from UTC
  displayTimezone: string;
}

export const getTimeConfig = (): TimeConfig => {
  try {
    // Detection logic for offline mode
    // 1. Check if we're running on local IP (most reliable)
    const isLocalIP = typeof window !== 'undefined' && (
      window.location.hostname === '10.21.118.100' || 
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    );
    
    // 2. Check for offline mode indicators
    const hasOfflineIndicator = typeof window !== 'undefined' && (
      localStorage.getItem('offline_mode') === 'true' ||
      window.location.search.includes('offline=true')
    );
    
    const isOfflineMode = isLocalIP || hasOfflineIndicator;
    
    return {
      isOfflineMode,
      timezoneOffset: isOfflineMode ? 7 : 0, // UTC+7 for local, UTC+0 for internet
      displayTimezone: isOfflineMode ? 'Asia/Ho_Chi_Minh' : 'UTC'
    };
  } catch {
    // Fallback to internet mode if any error occurs
    return {
      isOfflineMode: false,
      timezoneOffset: 0,
      displayTimezone: 'UTC'
    };
  }
};

export const convertToLocalTime = (utcTime: Date | string): Date => {
  const config = getTimeConfig();
  const date = new Date(utcTime);
  
  if (config.isOfflineMode) {
    // Local environment: Database is in UTC, need to add timezone offset for display
    const localTime = new Date(date.getTime() + (config.timezoneOffset * 60 * 60 * 1000));
    console.log('🕐 convertToLocalTime:', {
      input: utcTime,
      utcDate: date,
      localTime,
      offset: config.timezoneOffset,
      isOfflineMode: config.isOfflineMode
    });
    return localTime;
  }
  
  // Internet environment: Return as-is (existing logic preserved)
  return date;
};

export const convertToUTC = (localTime: Date | string): Date => {
  const config = getTimeConfig();
  const date = new Date(localTime);
  
  if (config.isOfflineMode) {
    // Local environment: Subtract timezone offset to store as UTC
    return new Date(date.getTime() - (config.timezoneOffset * 60 * 60 * 1000));
  }
  
  // Internet environment: Return as-is (existing logic preserved)
  return date;
};

export const formatTimeForDisplay = (utcTime: Date | string): string => {
  const localTime = convertToLocalTime(utcTime);
  
  const formatted = localTime.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  console.log('🕐 formatTimeForDisplay:', {
    input: utcTime,
    localTime,
    formatted
  });
  
  return formatted;
};

export const formatDateTimeForDisplay = (utcTime: Date | string): string => {
  const localTime = convertToLocalTime(utcTime);
  
  return localTime.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

export const getCurrentLocalTime = (): Date => {
  const now = new Date();
  const config = getTimeConfig();
  
  if (config.isOfflineMode) {
    // For local environment, ensure we're working with local time
    return now;
  }
  
  // For internet environment, existing logic
  return now;
};

export const isTimeInRange = (currentTime: Date, startTime: Date, endTime: Date): boolean => {
  const config = getTimeConfig();
  
  if (config.isOfflineMode) {
    // Convert all times to local for comparison
    const localCurrent = convertToLocalTime(currentTime);
    const localStart = convertToLocalTime(startTime);
    const localEnd = convertToLocalTime(endTime);
    
    return localCurrent >= localStart && localCurrent <= localEnd;
  }
  
  // Internet environment: existing comparison logic
  return currentTime >= startTime && currentTime <= endTime;
};

// Debug helper
export const debugTimezone = () => {
  const config = getTimeConfig();
  console.log('🌍 Timezone Debug:', {
    isOfflineMode: config.isOfflineMode,
    timezoneOffset: config.timezoneOffset,
    displayTimezone: config.displayTimezone,
    currentTime: new Date(),
    currentLocalTime: convertToLocalTime(new Date()),
    environment: import.meta.env.NODE_ENV,
    offlineModeEnv: import.meta.env.VITE_OFFLINE_MODE
  });
};