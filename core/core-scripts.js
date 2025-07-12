/**
 * Health Tracker App - Complete Core Functionality and Data Management
 * Enhanced for iOS Safari PWA compatibility
 */

// iOS Detection
const isIOSDevice = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
};

const isIOSSafari = () => {
  return isIOSDevice() && /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|OPiOS|mercury/.test(navigator.userAgent);
};

// iOS-Optimized Storage Manager
const iosStorageManager = {
  // Check if we're on iOS
  isIOS: isIOSDevice,
  
  // Test if localStorage is available (iOS private mode check)
  isAvailable: function() {
    try {
      const test = 'ios_storage_test';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      console.warn('iOS localStorage not available:', e);
      
      // Show user-friendly message for iOS private mode
      if (this.isIOS()) {
        this.showPrivateModeWarning();
      }
      return false;
    }
  },
  
  // Show warning for iOS private mode
  showPrivateModeWarning: function() {
    setTimeout(() => {
      if (typeof utils !== 'undefined' && utils.showToast) {
        utils.showToast('Private browsing detected. Some features may not work properly.', 'warning', 5000);
      }
    }, 1000);
  },
  
  // Estimate current usage with iOS-specific handling
  getUsage: function() {
    let total = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        if (key && value) {
          total += key.length + value.length;
        }
      }
    } catch (e) {
      console.warn('Error calculating storage usage:', e);
    }
    return total;
  },
  
  // Get remaining space (iOS has stricter limits)
  getRemainingSpace: function() {
    const maxSize = this.isIOS() ? 2 * 1024 * 1024 : 5 * 1024 * 1024; // 2MB for iOS, 5MB others
    return maxSize - this.getUsage();
  },
  
  // Check if near quota (more conservative for iOS)
  isNearQuota: function() {
    const maxSize = this.isIOS() ? 2 * 1024 * 1024 : 5 * 1024 * 1024;
    const currentUsage = this.getUsage();
    const threshold = this.isIOS() ? 0.7 : 0.9; // 70% for iOS, 90% for others
    return currentUsage > maxSize * threshold;
  },
  
  // iOS-optimized cleanup
  cleanupOldData: function() {
    try {
      const daysToKeep = this.isIOS() ? 30 : 90; // Keep less data on iOS
      const historyKeys = [
        'history_water',
        'history_protein',
        'workout_history',
        'habits_data'
      ];
      
      let cleanedUp = false;
      
      historyKeys.forEach(key => {
        try {
          const historyData = localStorage.getItem(key);
          if (!historyData) return;
          
          const history = JSON.parse(historyData);
          
          if (key === 'habits_data' && Array.isArray(history)) {
            // Cleanup habits data
            history.forEach(habit => {
              if (habit.history) {
                const dates = Object.keys(habit.history).sort();
                if (dates.length > daysToKeep) {
                  const datesToRemove = dates.slice(0, dates.length - daysToKeep);
                  datesToRemove.forEach(date => {
                    delete habit.history[date];
                  });
                  cleanedUp = true;
                }
              }
            });
            
            if (cleanedUp) {
              localStorage.setItem(key, JSON.stringify(history));
            }
          } else if (typeof history === 'object' && history !== null) {
            // Standard history object cleanup
            const dates = Object.keys(history).sort();
            
            if (dates.length > daysToKeep) {
              const datesToRemove = dates.slice(0, dates.length - daysToKeep);
              datesToRemove.forEach(date => {
                delete history[date];
              });
              
              localStorage.setItem(key, JSON.stringify(history));
              cleanedUp = true;
            }
          }
        } catch (e) {
          console.error(`Error cleaning up ${key}:`, e);
        }
      });
      
      return cleanedUp;
    } catch (e) {
      console.error('Error in cleanup:', e);
      return false;
    }
  },
  
  // Safe set item with iOS-specific error handling
  safeSetItem: function(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      console.warn('Storage error:', e);
      
      // Handle quota exceeded errors
      if (e.name === 'QuotaExceededError' || 
          e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
          e.code === 22) {
        
        // Try cleanup first
        const cleaned = this.cleanupOldData();
        
        if (cleaned) {
          try {
            localStorage.setItem(key, value);
            if (typeof utils !== 'undefined' && utils.showToast) {
              utils.showToast('Storage cleaned up to make room for new data.', 'info');
            }
            return true;
          } catch (e2) {
            // Still failed after cleanup
            this.handleStorageFull();
            return false;
          }
        } else {
          this.handleStorageFull();
          return false;
        }
      }
      
      // Other storage errors
      if (typeof utils !== 'undefined' && utils.showToast) {
        utils.showToast('Error saving data. Please try again.', 'error');
      }
      return false;
    }
  },
  
  // Handle storage full situation
  handleStorageFull: function() {
    if (typeof utils !== 'undefined' && utils.showToast) {
      if (this.isIOS()) {
        utils.showToast('Storage full. Please export your data and clear some history.', 'error', 7000);
      } else {
        utils.showToast('Storage limit reached. Please export and clear some data.', 'error');
      }
    }
  }
};

// Replace the original storageManager with iOS-optimized version
const storageManager = iosStorageManager;

// Constants
const STORAGE_KEYS = {
  THEME: 'app_theme',
  LAST_RESET_PREFIX: 'lastResetDate_',
  GOAL_PREFIX: 'goal_',
  INTAKE_PREFIX: 'intake_',
  HISTORY_PREFIX: 'history_',
  REMINDER: 'global_reminder'
};

// Theme colors for different sections
const THEME_COLORS = {
  water: '#2196F3',
  protein: '#F44336',
  workout: '#673AB7',
  habits: '#4CAF50'  
};

// Enhanced utility functions for iOS
const utils = {
  /**
   * iOS-compatible date formatting
   */
  formatDate(date) {
    try {
      const d = new Date(date);
      
      if (isNaN(d.getTime())) {
        console.error('Invalid date provided to formatDate:', date);
        return this.formatDate(new Date());
      }
      
      // Use local date components for consistency across iOS
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Date formatting error:', error);
      return this.formatDate(new Date());
    }
  },
  
  // Enhanced date comparison for iOS
  isSameDay(date1, date2) {
    try {
      const d1 = new Date(date1);
      const d2 = new Date(date2);
      
      if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
        return false;
      }
      
      return d1.getFullYear() === d2.getFullYear() &&
             d1.getMonth() === d2.getMonth() &&
             d1.getDate() === d2.getDate();
    } catch (error) {
      console.error('Date comparison error:', error);
      return false;
    }
  },

  // iOS-optimized date parsing
  parseDate(dateString) {
    try {
      // Handle different input types
      if (dateString instanceof Date) {
        return dateString;
      }
      
      if (typeof dateString === 'number') {
        return new Date(dateString);
      }
      
      // Try ISO format first (most reliable on iOS)
      let date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date;
      }
      
      // Try manual parsing for iOS compatibility
      if (typeof dateString === 'string') {
        // Handle YYYY-MM-DD format
        const isoMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (isoMatch) {
          const [, year, month, day] = isoMatch;
          date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          if (!isNaN(date.getTime())) {
            return date;
          }
        }
        
        // Handle MM/DD/YYYY format
        const usMatch = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (usMatch) {
          const [, month, day, year] = usMatch;
          date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          if (!isNaN(date.getTime())) {
            return date;
          }
        }
      }
      
      console.warn('Unable to parse date:', dateString);
      return new Date();
    } catch (error) {
      console.error('Date parsing error:', error);
      return new Date();
    }
  },

  // iOS-compatible date display formatting
  formatDateForDisplay(date, options = {}) {
    try {
      const defaults = { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      };
      
      const opts = {...defaults, ...options};
      
      const d = this.parseDate(date);
      
      // Use Intl.DateTimeFormat for better iOS compatibility
      if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
        return new Intl.DateTimeFormat('en-US', opts).format(d);
      }
      
      // Fallback for older iOS versions
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
    } catch (error) {
      console.error('Date display formatting error:', error);
      return 'Invalid Date';
    }
  },
  
  /**
   * iOS-optimized toast notifications
   */
  showToast(message, type = 'success', duration = 3000) {
    try {
      const toastContainer = document.getElementById('toast-container');
      if (!toastContainer) {
        console.warn('Toast container not found');
        return;
      }
      
      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      
      const icon = document.createElement('i');
      icon.className = 'material-icons-round';
      
      switch (type) {
        case 'success':
          icon.textContent = 'check_circle';
          break;
        case 'warning':
          icon.textContent = 'warning';
          break;
        case 'error':
          icon.textContent = 'error';
          break;
        case 'info':
          icon.textContent = 'info';
          break;
        default:
          icon.textContent = 'info';
      }
      
      toast.appendChild(icon);
      
      const messageText = document.createTextNode(message);
      toast.appendChild(messageText);
      
      toastContainer.appendChild(toast);
      
      // Auto-remove toast
      const removeToast = () => {
        if (toast.parentNode) {
          toast.classList.add('toast-closing');
          setTimeout(() => {
            if (toast.parentNode) {
              toastContainer.removeChild(toast);
            }
          }, 300);
        }
      };
      
      setTimeout(removeToast, duration);
      
      // Limit number of toasts for iOS performance
      const toasts = toastContainer.querySelectorAll('.toast');
      if (toasts.length > 3) {
        const oldestToast = toasts[0];
        if (oldestToast.parentNode) {
          toastContainer.removeChild(oldestToast);
        }
      }
      
      // Add tap-to-dismiss for iOS
      if (isIOSDevice()) {
        toast.addEventListener('touchstart', removeToast, { passive: true });
      }
      
    } catch (error) {
      console.error('Toast error:', error);
      // Fallback to alert on iOS if toast fails
      if (isIOSDevice()) {
        alert(message);
      }
    }
  },
  
  /**
   * iOS-compatible theme color changes
   */
  changeThemeColor(color) {
    try {
      let metaThemeColor = document.querySelector('meta[name="theme-color"]');
      
      if (!metaThemeColor) {
        metaThemeColor = document.createElement('meta');
        metaThemeColor.setAttribute('name', 'theme-color');
        document.head.appendChild(metaThemeColor);
      }
      
      metaThemeColor.setAttribute('content', color);
      
      // Also update apple-mobile-web-app-status-bar-style for iOS
      if (isIOSDevice()) {
        let appleMetaColor = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
        if (appleMetaColor) {
          // Use appropriate status bar style based on color brightness
          const brightness = this.getColorBrightness(color);
          appleMetaColor.setAttribute('content', brightness > 128 ? 'default' : 'black-translucent');
        }
      }
    } catch (error) {
      console.error('Theme color change error:', error);
    }
  },
  
  // Calculate color brightness for iOS status bar
  getColorBrightness(hexColor) {
    try {
      const color = hexColor.replace('#', '');
      const r = parseInt(color.substr(0, 2), 16);
      const g = parseInt(color.substr(2, 2), 16);
      const b = parseInt(color.substr(4, 2), 16);
      return (r * 299 + g * 587 + b * 114) / 1000;
    } catch (error) {
      return 128; // Default to medium brightness
    }
  }
};

/**
 * iOS-optimized app initialization
 */
document.addEventListener('DOMContentLoaded', () => {
  try {
    console.log('Initializing app for iOS...');
    
    // Check localStorage availability first
    if (!storageManager.isAvailable()) {
      if (isIOSDevice()) {
        alert('This app requires data storage to function properly. Please disable Private Browsing mode in Safari and reload the app.');
      } else {
        alert('Your browser does not support local storage or it is disabled. The app may not work properly.');
      }
      return;
    }
    
    // iOS-specific optimizations
    if (isIOSDevice()) {
      // Disable zoom on iOS
      document.addEventListener('gesturestart', function (e) {
        e.preventDefault();
      });
      
      // Handle iOS safe areas
      document.documentElement.style.setProperty('--ios-safe-area-top', 'env(safe-area-inset-top)');
      document.documentElement.style.setProperty('--ios-safe-area-bottom', 'env(safe-area-inset-bottom)');
      
      // Prevent iOS bounce scrolling on body
      document.body.style.overscrollBehavior = 'none';
    }
    
    // Check storage quota
    if (storageManager.isNearQuota()) {
      utils.showToast('Storage space is running low. Consider exporting and clearing old data.', 'warning', 5000);
      
      // Auto-cleanup for iOS
      if (isIOSDevice()) {
        storageManager.cleanupOldData();
      }
    }

    // Initialize trackers
    window.waterTracker = new Tracker({ type: 'water', unit: 'ml' });
    window.proteinTracker = new Tracker({ type: 'protein', unit: 'g' });
    window.workoutTracker = new WorkoutTracker();
    window.habitsTracker = new HabitsTracker();
    
    // Set up theme
    initializeTheme();
    
    // Set up tab navigation
    initializeTabNavigation();
    
    // Set up panels
    initializePanels();
    
    // Set up tracker actions
    initializeTrackerActions(waterTracker);
    initializeTrackerActions(proteinTracker);
    initializeWorkoutTrackerActions(workoutTracker);
    
    // Set up notifications
    initializeGlobalNotifications();
    
    // Set up data management
    initializeDataManagement();
    
    // Apply initial theme color
    const isDarkTheme = document.body.classList.contains('dark-theme') || 
                        (!document.body.classList.contains('light-theme') && 
                         window.matchMedia('(prefers-color-scheme: dark)').matches);
    utils.changeThemeColor(isDarkTheme ? '#121212' : THEME_COLORS.water);
    
    console.log('App initialization complete');
    
  } catch (error) {
    console.error('App initialization failed:', error);
    
    // Show user-friendly error message
    setTimeout(() => {
      utils.showToast('App failed to initialize. Please refresh the page.', 'error', 10000);
    }, 1000);
  }
});

/**
 * Initialize data import/export functionality
 */
function initializeDataManagement() {
  const exportBtn = document.getElementById('export-data');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportData);
  }
  
  const importFileInput = document.getElementById('import-file');
  if (importFileInput) {
    importFileInput.addEventListener('change', importData);
  }
}

/**
 * Export tracking data to CSV file with iOS optimizations
 */
function exportData() {
  try {
    const csvString = convertDataToCSV();
    const csvBlob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const fileName = `health-tracker-export-${new Date().toISOString().slice(0,10)}.csv`;
    
    // iOS-specific download handling
    if (isIOSDevice() && navigator.share) {
      // Use Web Share API on iOS if available
      const file = new File([csvBlob], fileName, { type: 'text/csv' });
      
      navigator.share({
        title: 'Health Tracker Data Export',
        text: 'Your health tracking data',
        files: [file]
      }).then(() => {
        utils.showToast('Data exported successfully!', 'success');
      }).catch(error => {
        console.log('Web Share failed, falling back to download:', error);
        fallbackDownload();
      });
    } else {
      fallbackDownload();
    }
    
    function fallbackDownload() {
      const csvUrl = URL.createObjectURL(csvBlob);
      const link = document.createElement('a');
      link.setAttribute('href', csvUrl);
      link.setAttribute('download', fileName);
      
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(csvUrl);
      }, 100);
      
      utils.showToast('Data exported successfully!', 'success');
    }
    
    // Close the panel
    document.getElementById('more-options-panel').classList.remove('active');
    
  } catch (error) {
    console.error('Export error:', error);
    utils.showToast(`Error exporting data: ${error.message}`, 'error');
  }
}

/**
 * Import tracking data from CSV file with iOS optimizations
 */
function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  // iOS file size validation
  const maxSize = isIOSDevice() ? 2 * 1024 * 1024 : 5 * 1024 * 1024; // 2MB for iOS, 5MB others
  if (file.size > maxSize) {
    utils.showToast(`File too large. Maximum size is ${maxSize / (1024 * 1024)}MB.`, 'error');
    event.target.value = '';
    return;
  }
  
  if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
    utils.showToast('Invalid file type. Please upload a CSV file.', 'error');
    event.target.value = '';
    return;
  }
  
  const reader = new FileReader();
  
  reader.onload = function(e) {
    try {
      const csvData = e.target.result;
      const importedData = parseCSVData(csvData);
      
      if (!importedData) {
        throw new Error('Import file is empty or corrupt.');
      }
      
      // Calculate estimated storage requirements
      const importSize = JSON.stringify(importedData).length;
      const maxStorage = isIOSDevice() ? 2 * 1024 * 1024 : 5 * 1024 * 1024;
      
      if (importSize > maxStorage * 0.9) {
        throw new Error('Import file is too large for browser storage. Please try a smaller export file.');
      }
      
      if (confirm('This will replace your current tracking data. Are you sure you want to proceed?')) {
        const success = performDataImport(importedData);
        
        if (success) {
          utils.showToast('Data imported successfully! Reloading app...', 'success');
          setTimeout(() => location.reload(), 1500);
        }
      }
    } catch (error) {
      utils.showToast(`Error importing data: ${error.message}`, 'error');
      console.error('Import error:', error);
    }
    
    event.target.value = '';
  };
  
  reader.onerror = function() {
    utils.showToast('Error reading file. Please try again.', 'error');
    event.target.value = '';
  };
  
  reader.readAsText(file);
}

/**
 * Perform data import with iOS-optimized storage
 */
function performDataImport(importedData) {
  try {
    // Create backup first
    const backup = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      backup[key] = localStorage.getItem(key);
    }
    
    // Import water data
    if (importedData.water.goal) {
      if (!storageManager.safeSetItem(STORAGE_KEYS.GOAL_PREFIX + 'water', importedData.water.goal)) {
        throw new Error('Failed to import water goal');
      }
    }
    if (importedData.water.intake) {
      if (!storageManager.safeSetItem(STORAGE_KEYS.INTAKE_PREFIX + 'water', importedData.water.intake)) {
        throw new Error('Failed to import water intake');
      }
    }
    if (importedData.water.history) {
      if (!storageManager.safeSetItem(STORAGE_KEYS.HISTORY_PREFIX + 'water', importedData.water.history)) {
        throw new Error('Failed to import water history');
      }
    }
    
    // Import protein data
    if (importedData.protein.goal) {
      if (!storageManager.safeSetItem(STORAGE_KEYS.GOAL_PREFIX + 'protein', importedData.protein.goal)) {
        throw new Error('Failed to import protein goal');
      }
    }
    if (importedData.protein.intake) {
      if (!storageManager.safeSetItem(STORAGE_KEYS.INTAKE_PREFIX + 'protein', importedData.protein.intake)) {
        throw new Error('Failed to import protein intake');
      }
    }
    if (importedData.protein.history) {
      if (!storageManager.safeSetItem(STORAGE_KEYS.HISTORY_PREFIX + 'protein', importedData.protein.history)) {
        throw new Error('Failed to import protein history');
      }
    }
    
    // Import workout data if available
    if (importedData.workout) {
      if (importedData.workout.state) {
        if (!storageManager.safeSetItem('workout_state', importedData.workout.state)) {
          throw new Error('Failed to import workout state');
        }
      }
      if (importedData.workout.count) {
        if (!storageManager.safeSetItem('workout_count', importedData.workout.count)) {
          throw new Error('Failed to import workout count');
        }
      }
      if (importedData.workout.history) {
        if (!storageManager.safeSetItem('workout_history', importedData.workout.history)) {
          throw new Error('Failed to import workout history');
        }
      }
    }
    
    // Import habits data if available
    if (importedData.habits && importedData.habits.data) {
      if (!storageManager.safeSetItem('habits_data', importedData.habits.data)) {
        throw new Error('Failed to import habits data');
      }
    }
    
    // Import settings
    if (importedData.settings && importedData.settings.theme) {
      storageManager.safeSetItem(STORAGE_KEYS.THEME, importedData.settings.theme);
    }
    if (importedData.settings && importedData.settings.reminder) {
      storageManager.safeSetItem(STORAGE_KEYS.REMINDER, importedData.settings.reminder);
    }
    
    return true;
    
  } catch (storageError) {
    console.error('Storage error during import:', storageError);
    utils.showToast(`Import failed: ${storageError.message}`, 'error');
    return false;
  }
}

/**
 * Convert application data to CSV format
 */
function convertDataToCSV() {
  const rows = []; 
  
  // Add CSV header row
  const headers = [
    "data_type", "key", "value", "date", "amount", "timestamp", "type", "count", "name", "color", "completed", "order"
  ];
  rows.push(headers.join(","));
  
  // Helper function to escape CSV values
  const escapeCSV = (value) => {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };
  
  // Helper function to add a data row
  const addRow = (dataType, key, value) => {
    const row = new Array(headers.length).fill('');
    row[0] = dataType;
    row[1] = key;
    row[2] = value;
    rows.push(row.map(escapeCSV).join(','));
  };
  
  // Add version info
  addRow("meta", "version", "3.0");
  addRow("meta", "exportDate", new Date().toISOString());
  
  // Process water data
  const waterGoal = localStorage.getItem(STORAGE_KEYS.GOAL_PREFIX + 'water');
  addRow("water", "goal", waterGoal);
  
  const waterIntake = localStorage.getItem(STORAGE_KEYS.INTAKE_PREFIX + 'water');
  addRow("water", "intake", waterIntake);
  
  const waterHistory = JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY_PREFIX + 'water') || '{}');
  Object.entries(waterHistory).forEach(([date, entries]) => {
    entries.forEach((entry, index) => {
      const row = new Array(headers.length).fill('');
      row[0] = "water_history";
      row[1] = `${date}_${index}`;
      row[3] = date;
      row[4] = entry.amount;
      row[5] = entry.timestamp;
      rows.push(row.map(escapeCSV).join(','));
    });
  });
  
  // Process protein data
  const proteinGoal = localStorage.getItem(STORAGE_KEYS.GOAL_PREFIX + 'protein');
  addRow("protein", "goal", proteinGoal);
  
  const proteinIntake = localStorage.getItem(STORAGE_KEYS.INTAKE_PREFIX + 'protein');
  addRow("protein", "intake", proteinIntake);
  
  const proteinHistory = JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY_PREFIX + 'protein') || '{}');
  Object.entries(proteinHistory).forEach(([date, entries]) => {
    entries.forEach((entry, index) => {
      const row = new Array(headers.length).fill('');
      row[0] = "protein_history";
      row[1] = `${date}_${index}`;
      row[3] = date;
      row[4] = entry.amount;
      row[5] = entry.timestamp;
      rows.push(row.map(escapeCSV).join(','));
    });
  });
  
  // Process workout data
  const workoutState = JSON.parse(localStorage.getItem('workout_state') || '{}');
  Object.entries(workoutState).forEach(([type, state]) => {
    const row = new Array(headers.length).fill('');
    row[0] = "workout_state";
    row[1] = type;
    row[6] = type;
    row[10] = state.completed;
    row[11] = state.order;
    rows.push(row.map(escapeCSV).join(','));
  });
  
  const workoutCount = JSON.parse(localStorage.getItem('workout_count') || '{}');
  Object.entries(workoutCount).forEach(([type, count]) => {
    const row = new Array(headers.length).fill('');
    row[0] = "workout_count";
    row[1] = type;
    row[6] = type;
    row[7] = count;
    rows.push(row.map(escapeCSV).join(','));
  });
  
  const workoutHistory = JSON.parse(localStorage.getItem('workout_history') || '{}');
  Object.entries(workoutHistory).forEach(([date, entries]) => {
    entries.forEach((entry, index) => {
      const row = new Array(headers.length).fill('');
      row[0] = "workout_history";
      row[1] = `${date}_${index}`;
      row[3] = date;
      row[5] = entry.timestamp;
      row[6] = entry.type;
      row[7] = entry.count;
      rows.push(row.map(escapeCSV).join(','));
    });
  });
  
  // Process habits data
  const habitsData = JSON.parse(localStorage.getItem('habits_data') || '[]');
  habitsData.forEach((habit, habitIndex) => {
    const row = new Array(headers.length).fill('');
    row[0] = "habit";
    row[1] = habitIndex.toString();
    row[8] = habit.name;
    row[9] = habit.color;
    rows.push(row.map(escapeCSV).join(','));
    
    // Process habit history
    if (habit.history) {
      Object.entries(habit.history).forEach(([date, status]) => {
        const historyRow = new Array(headers.length).fill('');
        historyRow[0] = "habit_history";
        historyRow[1] = `${habitIndex}_${date}`;
        historyRow[2] = status;
        historyRow[3] = date;
        rows.push(historyRow.map(escapeCSV).join(','));
      });
    }
  });
  
  // Add settings
  const theme = localStorage.getItem(STORAGE_KEYS.THEME);
  addRow("settings", "theme", theme);
  
  const reminder = localStorage.getItem(STORAGE_KEYS.REMINDER);
  addRow("settings", "reminder", reminder);
  
  return rows.join('\n');
}

/**
 * Parse CSV data and convert to app format
 */
function parseCSVData(csvData) {
  const rows = csvData.split(/\r?\n/);
  if (rows.length < 2) throw new Error('Invalid CSV file format');
  
  const headers = parseCSVRow(rows[0]);
  const headerMap = {};
  headers.forEach((header, index) => {
    headerMap[header] = index;
  });
  
  // Initialize data structure
  const importedData = {
    version: "3.0",
    exportDate: new Date().toISOString(),
    water: { goal: null, intake: null, history: {} },
    protein: { goal: null, intake: null, history: {} },
    workout: { state: {}, count: {}, history: {} },
    habits: { data: [] },
    settings: { theme: null, reminder: null }
  };
  
  // Process each data row
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i].trim()) continue;
    
    const row = parseCSVRow(rows[i]);
    const dataType = row[headerMap.data_type];
    const key = row[headerMap.key];
    const value = row[headerMap.value];
    
    switch (dataType) {
      case 'meta':
        if (key === 'version') importedData.version = value;
        if (key === 'exportDate') importedData.exportDate = value;
        break;
        
      case 'water':
        if (key === 'goal') importedData.water.goal = value;
        if (key === 'intake') importedData.water.intake = value;
        break;
        
      case 'water_history':
        const waterDate = row[headerMap.date];
        const waterAmount = parseInt(row[headerMap.amount]);
        const waterTimestamp = row[headerMap.timestamp];
        
        if (!importedData.water.history[waterDate]) {
          importedData.water.history[waterDate] = [];
        }
        
        importedData.water.history[waterDate].push({
          amount: waterAmount,
          timestamp: waterTimestamp
        });
        break;
        
      case 'protein':
        if (key === 'goal') importedData.protein.goal = value;
        if (key === 'intake') importedData.protein.intake = value;
        break;
        
      case 'protein_history':
        const proteinDate = row[headerMap.date];
        const proteinAmount = parseInt(row[headerMap.amount]);
        const proteinTimestamp = row[headerMap.timestamp];
        
        if (!importedData.protein.history[proteinDate]) {
          importedData.protein.history[proteinDate] = [];
        }
        
        importedData.protein.history[proteinDate].push({
          amount: proteinAmount,
          timestamp: proteinTimestamp
        });
        break;
        
      case 'workout_state':
        const workoutType = row[headerMap.type];
        const completed = row[headerMap.completed] === 'true';
        const order = parseInt(row[headerMap.order]);
        
        importedData.workout.state[workoutType] = {
          completed: completed,
          order: order
        };
        break;
        
      case 'workout_count':
        const countType = row[headerMap.type];
        const count = parseInt(row[headerMap.count]);
        importedData.workout.count[countType] = count;
        break;
        
      case 'workout_history':
        const workoutDate = row[headerMap.date];
        const entryType = row[headerMap.type];
        const entryCount = parseInt(row[headerMap.count]);
        const entryTimestamp = row[headerMap.timestamp];
        
        if (!importedData.workout.history[workoutDate]) {
          importedData.workout.history[workoutDate] = [];
        }
        
        importedData.workout.history[workoutDate].push({
          type: entryType,
          count: entryCount,
          timestamp: entryTimestamp
        });
        break;
        
      case 'habit':
        const habitIndex = parseInt(key);
        const habitName = row[headerMap.name];
        const habitColor = row[headerMap.color];
        
        while (importedData.habits.data.length <= habitIndex) {
          importedData.habits.data.push({ history: {} });
        }
        
        importedData.habits.data[habitIndex] = {
          name: habitName,
          color: habitColor,
          history: importedData.habits.data[habitIndex].history || {}
        };
        break;
        
      case 'habit_history':
        const [habitIdx, historyDate] = key.split('_');
        const status = value;
        
        const idx = parseInt(habitIdx);
        while (importedData.habits.data.length <= idx) {
          importedData.habits.data.push({ history: {} });
        }
        
        if (!importedData.habits.data[idx].history) {
          importedData.habits.data[idx].history = {};
        }
        
        importedData.habits.data[idx].history[historyDate] = status;
        break;
        
      case 'settings':
        if (key === 'theme') importedData.settings.theme = value;
        if (key === 'reminder') importedData.settings.reminder = value;
        break;
    }
  }
  
  // Convert to format expected by import function
  return {
    version: importedData.version,
    exportDate: importedData.exportDate,
    water: {
      goal: importedData.water.goal,
      intake: importedData.water.intake,
      history: JSON.stringify(importedData.water.history)
    },
    protein: {
      goal: importedData.protein.goal,
      intake: importedData.protein.intake,
      history: JSON.stringify(importedData.protein.history)
    },
    workout: {
      state: JSON.stringify(importedData.workout.state),
      count: JSON.stringify(importedData.workout.count),
      history: JSON.stringify(importedData.workout.history)
    },
    habits: {
      data: JSON.stringify(importedData.habits.data)
    },
    settings: importedData.settings
  };
}

/**
 * Parse a single CSV row, handling quoted values correctly
 */
function parseCSVRow(row) {
  const result = [];
  let insideQuotes = false;
  let currentValue = '';
  let i = 0;
  
  while (i < row.length) {
    const char = row[i];
    
    if (char === '"') {
      if (i + 1 < row.length && row[i + 1] === '"') {
        currentValue += '"';
        i += 2;
        continue;
      }
      
      insideQuotes = !insideQuotes;
      i++;
      continue;
    }
    
    if (char === ',' && !insideQuotes) {
      result.push(currentValue);
      currentValue = '';
      i++;
      continue;
    }
    
    currentValue += char;
    i++;
  }
  
  result.push(currentValue);
  return result;
}

/**
 * iOS-optimized service worker registration
 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Check if we're in iOS Safari
    if (isIOSSafari()) {
      console.log('Registering service worker for iOS Safari...');
    }
    
    const swRegistrationTimeout = setTimeout(() => {
      console.warn('Service Worker registration is taking too long.');
      if (isIOSDevice()) {
        utils.showToast('App is installing for offline use...', 'info', 3000);
      }
    }, 8000); // Longer timeout for iOS
    
    navigator.serviceWorker.register('./service-worker.js', {
      scope: './'  // Explicit scope for iOS
    })
      .then(registration => {
        clearTimeout(swRegistrationTimeout);
        console.log('Service Worker registered:', registration.scope);
        
        // Handle iOS-specific update scenarios
        if (registration.waiting) {
          registration.waiting.postMessage({ action: 'skipWaiting' });
        }
        
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              if (isIOSDevice()) {
                // iOS requires reload for proper activation
                utils.showToast('App updated! Refreshing...', 'info', 2000);
                setTimeout(() => window.location.reload(), 2000);
              } else {
                utils.showToast('App update available. Please refresh the page.', 'info');
              }
            }
          });
        });
        
        // Show success message for iOS
        if (isIOSSafari()) {
          setTimeout(() => {
            utils.showToast('App is ready for offline use!', 'success', 3000);
          }, 2000);
        }
      })
      .catch(error => {
        clearTimeout(swRegistrationTimeout);
        console.error('Service Worker registration failed:', error);
        
        // iOS-specific error handling
        if (isIOSDevice()) {
          if (error.name === 'SecurityError') {
            utils.showToast('Offline mode unavailable in private browsing.', 'warning');
          } else {
            utils.showToast('Offline mode may not be available.', 'warning');
          }
        } else {
          utils.showToast('App may not work offline. Please refresh the page.', 'warning');
        }
      });
  });
}