/**
 * Health Tracker App - Notification Functionality
 * This file contains notification-related functionality
 */

// Storage keys for notification settings
const NOTIFICATION_STORAGE_KEYS = {
  SUPPLEMENTS_REMINDER: 'notification_supplements',
  WATER_ALERT: 'notification_water_alert',
  PROTEIN_ALERT: 'notification_protein_alert',
  WATER_INTERVAL: 'notification_water_interval'
};

// Global reminder interval
let globalReminderInterval = null;

// Scheduled notification timers
let supplementsMorningTimer = null;
let supplementsEveningTimer = null;
let waterAlertTimer = null;
let proteinAlertTimer = null;

/**
 * Initialize global notifications
 */
function initializeGlobalNotifications() {
  // Don't check permission on load - wait for user interaction
  // Only highlight the toggle container if we know notifications are supported
  if ('Notification' in window) {
    document.querySelectorAll('#global-enable-notifications-container').forEach(container => {
      container.classList.add('highlight');
    });
  }
  
  // Set up notification toggle switches
  initializeNotificationToggles();
  
  // Schedule notifications based on saved preferences
  scheduleAllNotifications();
}

/**
 * Initialize notification toggle switches
 */
function initializeNotificationToggles() {
  // Global notification toggle
  const enableNotificationsToggles = document.querySelectorAll('#global-enable-notifications-toggle');
  if (enableNotificationsToggles.length > 0) {
    // Set initial state based on permission
    if ('Notification' in window) {
      const isEnabled = Notification.permission === 'granted';
      enableNotificationsToggles.forEach(toggle => {
        toggle.checked = isEnabled;
      });
    }
    
    // Add event listener for toggle
    enableNotificationsToggles.forEach(toggle => {
      toggle.addEventListener('change', (e) => {
        if (e.target.checked) {
          requestNotificationPermission();
        } else {
          // Show toast informing that notifications are now disabled
          utils.showToast('Notifications are now disabled', 'info');
          // Note: We can't actually revoke permissions once granted,
          // but we can indicate to the user they're now "disabled" in our UI
        }
      });
    });
  }
  
  // Supplements reminder toggle
  const supplementsToggle = document.getElementById('supplements-reminder-toggle');
  if (supplementsToggle) {
    const isEnabled = localStorage.getItem(NOTIFICATION_STORAGE_KEYS.SUPPLEMENTS_REMINDER) === 'true';
    supplementsToggle.checked = isEnabled;
    
    supplementsToggle.addEventListener('change', (e) => {
      localStorage.setItem(NOTIFICATION_STORAGE_KEYS.SUPPLEMENTS_REMINDER, e.target.checked);
      if (e.target.checked) {
        scheduleSupplementsReminders();
        utils.showToast('Supplements reminders enabled', 'success');
      } else {
        clearSupplementsReminders();
        utils.showToast('Supplements reminders disabled', 'info');
      }
    });
  }
  
  // Water alert toggle
  const waterToggle = document.getElementById('water-reminder-toggle');
  if (waterToggle) {
    const isEnabled = localStorage.getItem(NOTIFICATION_STORAGE_KEYS.WATER_ALERT) === 'true';
    waterToggle.checked = isEnabled;
    
    waterToggle.addEventListener('change', (e) => {
      localStorage.setItem(NOTIFICATION_STORAGE_KEYS.WATER_ALERT, e.target.checked);
      if (e.target.checked) {
        scheduleWaterAlert();
        utils.showToast('Water intake alert enabled', 'success');
      } else {
        clearWaterAlert();
        utils.showToast('Water intake alert disabled', 'info');
      }
    });
  }
  
  // Protein alert toggle
  const proteinToggle = document.getElementById('protein-reminder-toggle');
  if (proteinToggle) {
    const isEnabled = localStorage.getItem(NOTIFICATION_STORAGE_KEYS.PROTEIN_ALERT) === 'true';
    proteinToggle.checked = isEnabled;
    
    proteinToggle.addEventListener('change', (e) => {
      localStorage.setItem(NOTIFICATION_STORAGE_KEYS.PROTEIN_ALERT, e.target.checked);
      if (e.target.checked) {
        scheduleProteinAlert();
        utils.showToast('Protein intake alert enabled', 'success');
      } else {
        clearProteinAlert();
        utils.showToast('Protein intake alert disabled', 'info');
      }
    });
  }
  
  // Initialize water interval reminder in water settings
  const waterSetReminderBtn = document.getElementById('water-set-reminder');
  if (waterSetReminderBtn) {
    waterSetReminderBtn.addEventListener('click', () => {
      const input = document.getElementById('water-reminder-time');
      const minutes = parseInt(input.value);
      
      if (isNaN(minutes) || minutes <= 0) {
        utils.showToast('Please enter a valid reminder interval.', 'error');
        return;
      }
      
      startWaterIntervalReminder(minutes);
      
      utils.showToast(`Water reminder set for every ${minutes} minutes.`, 'success');
      
      // Close the water settings panel
      document.getElementById('water-settings-section').classList.remove('active');
    });
    
    // Set the input value if a reminder is already set
    const savedInterval = localStorage.getItem(NOTIFICATION_STORAGE_KEYS.WATER_INTERVAL);
    if (savedInterval) {
      const waterReminderTimeInput = document.getElementById('water-reminder-time');
      if (waterReminderTimeInput) {
        waterReminderTimeInput.value = savedInterval;
      }
    }
  }
}

/**
 * Schedule all notifications based on saved preferences
 */
function scheduleAllNotifications() {
  // Check if notifications are enabled in the browser
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }
  
  // Schedule supplements reminders if enabled
  if (localStorage.getItem(NOTIFICATION_STORAGE_KEYS.SUPPLEMENTS_REMINDER) === 'true') {
    scheduleSupplementsReminders();
  }
  
  // Schedule water alert if enabled
  if (localStorage.getItem(NOTIFICATION_STORAGE_KEYS.WATER_ALERT) === 'true') {
    scheduleWaterAlert();
  }
  
  // Schedule protein alert if enabled
  if (localStorage.getItem(NOTIFICATION_STORAGE_KEYS.PROTEIN_ALERT) === 'true') {
    scheduleProteinAlert();
  }
  
  // Schedule water interval reminder if enabled
  const interval = localStorage.getItem(NOTIFICATION_STORAGE_KEYS.WATER_INTERVAL);
  if (interval) {
    startWaterIntervalReminder(parseInt(interval));
  }
}

/**
 * Schedule supplements reminders (9am and 10pm)
 */
function scheduleSupplementsReminders() {
  clearSupplementsReminders();
  
  const now = new Date();
  const morningTime = new Date(now);
  morningTime.setHours(9, 0, 0, 0);
  
  const eveningTime = new Date(now);
  eveningTime.setHours(22, 0, 0, 0);
  
  // If times have passed for today, schedule for tomorrow
  if (now > morningTime) {
    morningTime.setDate(morningTime.getDate() + 1);
  }
  
  if (now > eveningTime) {
    eveningTime.setDate(eveningTime.getDate() + 1);
  }
  
  // Schedule morning reminder
  const morningDelay = morningTime - now;
  supplementsMorningTimer = setTimeout(() => {
    sendNotification('Supplements Reminder', 'Time to take your morning supplements');
    // Reschedule for next day
    const nextDay = new Date();
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(9, 0, 0, 0);
    const nextDelay = nextDay - new Date();
    supplementsMorningTimer = setTimeout(() => scheduleSupplementsReminders(), nextDelay);
  }, morningDelay);
  
  // Schedule evening reminder
  const eveningDelay = eveningTime - now;
  supplementsEveningTimer = setTimeout(() => {
    sendNotification('Supplements Reminder', 'Time to take your evening supplements');
    // No need to reschedule here as the morning reminder will reschedule both
  }, eveningDelay);
}

/**
 * Clear supplements reminders
 */
function clearSupplementsReminders() {
  if (supplementsMorningTimer) {
    clearTimeout(supplementsMorningTimer);
    supplementsMorningTimer = null;
  }
  
  if (supplementsEveningTimer) {
    clearTimeout(supplementsEveningTimer);
    supplementsEveningTimer = null;
  }
}

/**
 * Schedule water alert at 8pm
 */
function scheduleWaterAlert() {
  clearWaterAlert();
  
  const now = new Date();
  const alertTime = new Date(now);
  alertTime.setHours(20, 0, 0, 0);
  
  // If time has passed for today, schedule for tomorrow
  if (now > alertTime) {
    alertTime.setDate(alertTime.getDate() + 1);
  }
  
  // Schedule alert
  const delay = alertTime - now;
  waterAlertTimer = setTimeout(() => {
    checkWaterIntakeAndNotify();
    // Reschedule for next day
    const nextDay = new Date();
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(20, 0, 0, 0);
    const nextDelay = nextDay - new Date();
    waterAlertTimer = setTimeout(() => scheduleWaterAlert(), nextDelay);
  }, delay);
}

/**
 * Check water intake level and send notification if needed
 */
function checkWaterIntakeAndNotify() {
  // Get water tracker instance
  const waterTracker = window.waterTracker;
  if (!waterTracker) return;
  
  // Check if goal is met
  const goalMet = waterTracker.totalIntake >= waterTracker.goal;
  
  if (!goalMet && waterTracker.goal > 0) {
    const remaining = waterTracker.goal - waterTracker.totalIntake;
    sendNotification(
      'Water Intake Alert',
      `You're ${remaining}ml short of your daily water goal. Time to hydrate!`
    );
  }
}

/**
 * Clear water alert
 */
function clearWaterAlert() {
  if (waterAlertTimer) {
    clearTimeout(waterAlertTimer);
    waterAlertTimer = null;
  }
}

/**
 * Schedule protein alert at 8pm
 */
function scheduleProteinAlert() {
  clearProteinAlert();
  
  const now = new Date();
  const alertTime = new Date(now);
  alertTime.setHours(20, 0, 0, 0);
  
  // If time has passed for today, schedule for tomorrow
  if (now > alertTime) {
    alertTime.setDate(alertTime.getDate() + 1);
  }
  
  // Schedule alert
  const delay = alertTime - now;
  proteinAlertTimer = setTimeout(() => {
    checkProteinIntakeAndNotify();
    // Reschedule for next day
    const nextDay = new Date();
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(20, 0, 0, 0);
    const nextDelay = nextDay - new Date();
    proteinAlertTimer = setTimeout(() => scheduleProteinAlert(), nextDelay);
  }, delay);
}

/**
 * Check protein intake level and send notification if needed
 */
function checkProteinIntakeAndNotify() {
  // Get protein tracker instance
  const proteinTracker = window.proteinTracker;
  if (!proteinTracker) return;
  
  // Check if goal is met
  const goalMet = proteinTracker.totalIntake >= proteinTracker.goal;
  
  if (!goalMet && proteinTracker.goal > 0) {
    const remaining = proteinTracker.goal - proteinTracker.totalIntake;
    sendNotification(
      'Protein Intake Alert',
      `You're ${remaining}g short of your daily protein goal. Time to fuel up!`
    );
  }
}

/**
 * Clear protein alert
 */
function clearProteinAlert() {
  if (proteinAlertTimer) {
    clearTimeout(proteinAlertTimer);
    proteinAlertTimer = null;
  }
}

/**
 * Start water interval reminder
 * @param {number} minutes - Minutes between reminders
 */
function startWaterIntervalReminder(minutes) {
  // Clear any existing intervals
  if (globalReminderInterval) {
    clearInterval(globalReminderInterval);
  }
  
  if (!minutes || minutes <= 0) return;
  
  // Store the setting
  localStorage.setItem(NOTIFICATION_STORAGE_KEYS.WATER_INTERVAL, minutes);
  
  // Set new interval
  const milliseconds = minutes * 60 * 1000;
  globalReminderInterval = setInterval(() => {
    sendNotification('Water Reminder', `Time to drink some water!`);
  }, milliseconds);
}

/**
 * Clear water interval reminder
 */
function clearWaterIntervalReminder() {
  if (globalReminderInterval) {
    clearInterval(globalReminderInterval);
    globalReminderInterval = null;
  }
  
  localStorage.removeItem(NOTIFICATION_STORAGE_KEYS.WATER_INTERVAL);
}

/**
 * Request permission for browser notifications
 */
function requestNotificationPermission() {
  if (!('Notification' in window)) {
    utils.showToast('Your browser does not support notifications.', 'error');
    return;
  }
  
  try {
    Notification.requestPermission().then(permission => {
      // Update all toggle elements
      const toggles = document.querySelectorAll('#global-enable-notifications-toggle');
      
      if (permission === 'granted') {
        utils.showToast('Notifications enabled!', 'success');
        
        // Update toggle states
        toggles.forEach(toggle => {
          toggle.checked = true;
        });
        
        // Send test notification after a short delay
        setTimeout(() => {
          sendNotification('Health Tracker', 'Notifications are now enabled. You will be reminded to track your intake.');
        }, 500);
        
        // Schedule notifications based on saved preferences
        scheduleAllNotifications();
      } else if (permission === 'denied') {
        utils.showToast('Notification permission denied.', 'warning');
        
        // Update toggle states
        toggles.forEach(toggle => {
          toggle.checked = false;
        });
      } else {
        utils.showToast('Notification permission was not granted.', 'warning');
        
        // Update toggle states
        toggles.forEach(toggle => {
          toggle.checked = false;
        });
      }
    }).catch(error => {
      console.error('Error requesting notification permission:', error);
      utils.showToast('Error enabling notifications.', 'error');
    });
  } catch (error) {
    // Handle browsers that don't support Promise-based API
    console.error('Error requesting notification permission:', error);
    utils.showToast('Error enabling notifications.', 'error');
  }
}

/**
 * Send a notification
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 */
function sendNotification(title, body) {
  // Check if notifications are enabled
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    // Show toast instead
    utils.showToast(body, 'info');
    return;
  }
  
  // Send browser notification
  try {
    new Notification(title, {
      body: body,
      icon: 'icons/icon-192.png'
    });
    
    // Also show toast notification
    utils.showToast(body, 'info');
  } catch (error) {
    console.error('Error sending notification:', error);
    utils.showToast(body, 'info');
  }
}