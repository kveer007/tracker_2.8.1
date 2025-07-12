/**
 * Health Tracker App - UI Initialization
 * This file contains functions for initializing the UI components
 */

/**
 * Initialize theme (light/dark)
 */
function initializeTheme() {
  let savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);

  // If no theme saved, default to dark
  if (!savedTheme) {
    savedTheme = 'dark-theme';
    localStorage.setItem(STORAGE_KEYS.THEME, savedTheme);
  }

  document.body.classList.add(savedTheme);

  // Update theme-color meta tag based on theme
  const isDarkTheme = savedTheme === 'dark-theme';
  const themeColor = isDarkTheme ? '#121212' : '#F8F9FA';
  utils.changeThemeColor(themeColor);

  // Set up theme toggle button
  const themeToggleBtn = document.getElementById('toggle-theme');

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const currentTheme = document.body.classList.contains('dark-theme') ? 'dark-theme' : 'light-theme';
      const newTheme = currentTheme === 'dark-theme' ? 'light-theme' : 'dark-theme';

      document.body.classList.remove('dark-theme', 'light-theme');
      document.body.classList.add(newTheme);
      localStorage.setItem(STORAGE_KEYS.THEME, newTheme);

      const newColor = newTheme === 'dark-theme' ? '#121212' : '#F8F9FA';
      utils.changeThemeColor(newColor);
    });
  }
}

/**
 * Initialize tab navigation
 */
function initializeTabNavigation() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const appContainers = document.querySelectorAll('.app-container');
  
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const appType = btn.dataset.app;
      
      // Update button active state
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Update visible app container
      appContainers.forEach(container => {
        container.classList.remove('active');
        if (container.id === `${appType}-app`) {
          container.classList.add('active');
        }
      });
      
      // Update theme-color meta tag
      // Only update with the app-specific color if not in a specific theme mode
      const isDarkTheme = document.body.classList.contains('dark-theme') || 
                        (!document.body.classList.contains('light-theme') && 
                         window.matchMedia('(prefers-color-scheme: dark)').matches);
      
      if (!isDarkTheme && !document.body.classList.contains('light-theme')) {
        utils.changeThemeColor(THEME_COLORS[appType]);
      }
    });
  });
  
  // Inner tab navigation in history popups
  document.querySelectorAll('.tab-button').forEach(tabBtn => {
    tabBtn.addEventListener('click', () => {
      const tabId = tabBtn.dataset.tab;
      const tabsContainer = tabBtn.closest('.panel');
      
      // Update active state for buttons
      tabsContainer.querySelectorAll('.tab-button').forEach(b => {
        b.classList.remove('active');
      });
      tabBtn.classList.add('active');
      
      // Show active tab content
      tabsContainer.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });
      document.getElementById(tabId).classList.add('active');
    });
  });
  
  // Initialize history tabs
  document.getElementById('water-daily-history').classList.add('active');
  document.getElementById('protein-daily-history').classList.add('active');
  document.getElementById('workout-daily-history').classList.add('active');
}

/**
 * Initialize panels (settings, history, more options, notifications)
 */
function initializePanels() {
  // Panel toggle buttons
  const panelToggles = {
    'water-settings-toggle': 'water-settings-section',
    'water-history-toggle': 'water-history-popup',
    'protein-settings-toggle': 'protein-settings-section',
    'protein-history-toggle': 'protein-history-popup',
    'workout-settings-toggle': 'workout-settings-section',
    'workout-history-toggle': 'workout-history-popup',
    'more-options-toggle': 'more-options-panel',
    'notifications-settings-toggle': 'notifications-panel'  // Add the new notifications toggle
  };
  
  // Set up panel toggles
  Object.entries(panelToggles).forEach(([toggleId, panelId]) => {
    const toggleBtn = document.getElementById(toggleId);
    const panel = document.getElementById(panelId);
    
    if (toggleBtn && panel) {
      toggleBtn.addEventListener('click', () => {
        // Hide all other panels first
        document.querySelectorAll('.panel').forEach(p => {
          if (p.id !== panelId) {
            p.classList.remove('active');
          }
        });
        
        // Toggle this panel
        panel.classList.toggle('active');
      });
    }
  });
  
  // Close panel buttons
  document.querySelectorAll('.close-panel').forEach(closeBtn => {
    closeBtn.addEventListener('click', () => {
      const panel = closeBtn.closest('.panel');
      if (panel) {
        panel.classList.remove('active');
      }
    });
  });
  
  // Close panels when clicking outside - improved to prevent unintended closing
  document.addEventListener('click', (event) => {
    // Check if clicked element or its ancestors are panels or toggle buttons
    const isPanel = !!event.target.closest('.panel');
    const isToggle = !!event.target.closest('[id$="-toggle"]');
    const isTogglePressed = Object.keys(panelToggles).some(id => 
      event.target.closest(`#${id}`) !== null
    );
    
    // Only close panels if clicked outside any panel and toggle button
    if (!isPanel && !isToggle && !isTogglePressed) {
      document.querySelectorAll('.panel').forEach(panel => {
        panel.classList.remove('active');
      });
    }
  }, true);
}

/**
 * Initialize global notification buttons in options panel
 * Note: The main function for notification toggles is now in notification.js
 * This is kept for compatibility with any code that might call it
 */
function initializeGlobalNotificationButtons() {
  const setReminderBtn = document.getElementById('global-set-reminder');
  if (setReminderBtn) {
    setReminderBtn.addEventListener('click', () => {
      const input = document.getElementById('global-reminder-time');
      const minutes = parseInt(input.value);
      
      if (isNaN(minutes) || minutes <= 0) {
        utils.showToast('Please enter a valid reminder interval.', 'error');
        return;
      }
      
      localStorage.setItem(STORAGE_KEYS.REMINDER, minutes);
      startGlobalReminder(minutes);
      
      utils.showToast(`Reminder set for every ${minutes} minutes.`, 'success');
      
      // Close the options panel
      document.getElementById('more-options-panel').classList.remove('active');
    });
  }

  // Initialize reminder if it exists in localStorage
  const savedReminderInterval = localStorage.getItem(STORAGE_KEYS.REMINDER);
  if (savedReminderInterval) {
    startGlobalReminder(parseInt(savedReminderInterval));
  }
}

/**
 * Initialize tracker actions for a specific tracker
 * @param {Tracker} tracker - Tracker instance
 */
function initializeTrackerActions(tracker) {
  const type = tracker.type;
  
  // Set up quick add buttons
  document.querySelectorAll(`[data-action="${type}-add"]`).forEach(btn => {
    btn.addEventListener('click', () => {
      const amount = parseInt(btn.dataset.amount);
      if (!isNaN(amount) && amount > 0) {
        tracker.addIntake(amount);
      }
    });
  });
  
 // Set up manual add button
 const addManualBtn = document.getElementById(`${type}-add-manual`);
 if (addManualBtn) {
   addManualBtn.addEventListener('click', () => {
     tracker.addManualIntake();
   });
 }
 
 // Set up enter key for manual input
 const manualInput = document.getElementById(`${type}-manual`);
 if (manualInput) {
   manualInput.addEventListener('keypress', (event) => {
     if (event.key === 'Enter') {
       tracker.addManualIntake();
     }
   });
 }
 
 // Set goal button
 const setGoalBtn = document.getElementById(`${type}-set-goal`);
 if (setGoalBtn) {
   setGoalBtn.addEventListener('click', () => {
     tracker.setGoal();
   });
 }
 
 // Reset daily button
 const resetDailyBtn = document.getElementById(`${type}-reset-daily`);
 if (resetDailyBtn) {
   resetDailyBtn.addEventListener('click', () => {
     if (confirm(`Are you sure you want to reset today's ${type} intake data?`)) {
       tracker.resetDailyIntake();
       utils.showToast(`Today's ${type} intake has been reset.`, 'warning');
     }
   });
 }
 
 // Reset all data button
 const resetDataBtn = document.getElementById(`${type}-reset-data`);
 if (resetDataBtn) {
   resetDataBtn.addEventListener('click', () => {
     if (confirm(`⚠️ WARNING: This will delete ALL ${type} tracking data. This action cannot be undone. Are you sure?`)) {
       tracker.resetAllData();
     }
   });
 }
 
 // Initial history refresh
 tracker.refreshHistory();
}

/**
* Initialize workout tracker actions
* @param {WorkoutTracker} tracker - WorkoutTracker instance
*/
function initializeWorkoutTrackerActions(tracker) {
 // Reset tabs only button
 const resetTabsBtn = document.getElementById('workout-reset-tabs');
 if (resetTabsBtn) {
   resetTabsBtn.addEventListener('click', () => {
     tracker.resetWorkoutTabs();
     utils.showToast('Workout tabs have been reset.', 'warning');
     
     // Close the settings panel
     document.getElementById('workout-settings-section').classList.remove('active');
   });
 }
 
 // Reset daily button
 const resetDailyBtn = document.getElementById('workout-reset-daily');
 if (resetDailyBtn) {
   resetDailyBtn.addEventListener('click', () => {
     if (confirm('Are you sure you want to reset today\'s workout data? This will clear both the tabs and today\'s history.')) {
       tracker.resetDailyWorkouts();
       utils.showToast('Today\'s workout data has been reset.', 'warning');
     }
   });
 }
 
 // Reset all data button
 const resetDataBtn = document.getElementById('workout-reset-data');
 if (resetDataBtn) {
   resetDataBtn.addEventListener('click', () => {
     if (confirm('⚠️ WARNING: This will delete ALL workout tracking data. This action cannot be undone. Are you sure?')) {
       tracker.resetAllData();
     }
   });
 }
 
 // Initial history refresh
 tracker.refreshHistory();
}