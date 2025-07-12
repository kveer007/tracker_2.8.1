/**
 * Health Tracker App - Tracker Class
 * This file contains the Tracker class that handles both water and protein tracking
 */

/**
 * Main Tracker class for both water and protein tracking
 */
class Tracker {
  /**
   * Create a new tracker
   * @param {Object} config - Configuration object
   * @param {string} config.type - Type of tracker (water or protein)
   * @param {string} config.unit - Unit of measurement (ml or g)
   */
  constructor(config) {
    // Basic properties
    this.type = config.type;
    this.unit = config.unit;
    
    // Storage keys
    this.goalKey = `${STORAGE_KEYS.GOAL_PREFIX}${this.type}`;
    this.intakeKey = `${STORAGE_KEYS.INTAKE_PREFIX}${this.type}`;
    this.historyKey = `${STORAGE_KEYS.HISTORY_PREFIX}${this.type}`;
    this.lastResetKey = `${STORAGE_KEYS.LAST_RESET_PREFIX}${this.type}`;
    
    // Track timeout ID to prevent memory leaks
    this.midnightResetTimeout = null;
    
    // Load data from localStorage
    this.goal = parseInt(localStorage.getItem(this.goalKey)) || 0;
    this.totalIntake = parseInt(localStorage.getItem(this.intakeKey)) || 0;
    this.dailyHistory = JSON.parse(localStorage.getItem(this.historyKey)) || {};
    
    // DOM elements
    this.elements = {
      total: document.getElementById(`${this.type}-total`),
      remaining: document.getElementById(`${this.type}-remaining`),
      goalDisplay: document.getElementById(`${this.type}-goal-display`),
      progressCircle: document.getElementById(`${this.type}-progress-circle`),
      goalInput: document.getElementById(`${this.type}-goal`),
      manualInput: document.getElementById(`${this.type}-manual`),
      settingsPanel: document.getElementById(`${this.type}-settings-section`),
      historyPanel: document.getElementById(`${this.type}-history-popup`),
      dailyHistoryTab: document.getElementById(`${this.type}-daily-history`),
      currentIntakeTab: document.getElementById(`${this.type}-current-intake`)
    };
    
    // Initialize tracker
    this.initializeTracker();
  }
  
  /**
   * Initialize tracker
   */
  initializeTracker() {
    // Set up circular progress
    if (this.elements.progressCircle) {
      const circleLength = 2 * Math.PI * 45;
      this.elements.progressCircle.style.strokeDasharray = `${circleLength}`;
      this.elements.progressCircle.style.strokeDashoffset = `${circleLength}`;
    }
    
    // Update display
    this.updateDisplay();
    
    // Check for daily reset
    this.checkAndResetDailyIntake();
    
    // Set up auto-reset at midnight
    this.setupMidnightReset();
  }
  
  /**
   * Update the display with current data
   */
  updateDisplay() {
    // Update total
    if (this.elements.total) {
      this.elements.total.textContent = this.totalIntake;
    }
    
    // Update goal display
    if (this.elements.goalDisplay) {
      this.elements.goalDisplay.textContent = this.goal;
    }
    
    // Update remaining
    if (this.elements.remaining) {
      const remaining = this.goal > this.totalIntake ? this.goal - this.totalIntake : 0;
      this.elements.remaining.textContent = remaining;
    }
    
    // Update progress visualization
    this.updateProgressVisualization();
    
    // Save to localStorage
    localStorage.setItem(this.intakeKey, this.totalIntake);
  }

  /**
   * Update the progress visualization (circular progress)
   */
  updateProgressVisualization() {
    if (!this.elements.progressCircle) return;
    
    // Calculate progress percentage
    let progress = this.goal > 0 ? (this.totalIntake / this.goal) * 100 : 0;
    progress = Math.min(progress, 100); // Cap at 100%
    
    // Calculate circle values
    const circleLength = 2 * Math.PI * 45;
    const offset = circleLength - (progress / 100) * circleLength;
    
    // Update circle
    this.elements.progressCircle.style.strokeDashoffset = offset;
  }
  
  /**
   * Set the daily goal
   */
  setGoal() {
    const inputGoal = parseInt(this.elements.goalInput.value);
    
    if (isNaN(inputGoal) || inputGoal <= 0) {
      utils.showToast('Please enter a valid goal (a positive number).', 'error');
      return;
    }
    
    this.goal = inputGoal;
    localStorage.setItem(this.goalKey, this.goal);
    this.updateDisplay();
    
    utils.showToast(`${this.type.charAt(0).toUpperCase() + this.type.slice(1)} goal set to ${this.goal} ${this.unit}`, 'success');
    
    // Close the settings panel
    this.elements.settingsPanel.classList.remove('active');
  }
  
  /**
   * Add intake amount
   * @param {number} amount - Amount to add
   */
  addIntake(amount) {
    if (amount <= 0) return;
    
    this.totalIntake += amount;
    this.saveDailyHistory(amount);
    this.updateDisplay();
    this.refreshHistory();
    
    utils.showToast(`Added ${amount} ${this.unit} of ${this.type}`, 'success');
  }
  
  /**
   * Add manually entered intake
   */
  addManualIntake() {
    const amount = parseInt(this.elements.manualInput.value);
    
    if (!isNaN(amount) && amount > 0) {
      this.addIntake(amount);
      this.elements.manualInput.value = '';
    } else {
      utils.showToast(`Please enter a positive number.`, 'error');
    }
  }
  
  /**
   * Save intake to daily history
   * @param {number} amount - Amount to save
   */
  saveDailyHistory(amount) {
    const currentDate = utils.formatDate(new Date());
    
    if (!this.dailyHistory[currentDate]) {
      this.dailyHistory[currentDate] = [];
    }
    
    this.dailyHistory[currentDate].push({
      amount,
      timestamp: new Date().toISOString()
    });
    
    localStorage.setItem(this.historyKey, JSON.stringify(this.dailyHistory));
  }
  
  /**
   * Refresh history displays
   */
  refreshHistory() {
    this.showDailyHistory();
    this.showCurrentIntake();
  }
  
  /**
   * Check if daily intake needs to be reset
   */
  checkAndResetDailyIntake() {
    const currentDate = utils.formatDate(new Date());
    const lastResetDate = localStorage.getItem(this.lastResetKey);
    
    if (lastResetDate !== currentDate) {
      this.resetDailyIntake();
      localStorage.setItem(this.lastResetKey, currentDate);
    }
  }
  
  /**
   * Setup automatic reset at midnight
   */
  setupMidnightReset() {
    // Clear any existing timeout to prevent memory leaks
    if (this.midnightResetTimeout) {
      clearTimeout(this.midnightResetTimeout);
    }
    
    // Calculate time until next midnight
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const midnight = new Date(tomorrow.setHours(0, 0, 0, 0));
    const msUntilMidnight = midnight - now;
    
    // Set timeout for midnight reset
    this.midnightResetTimeout = setTimeout(() => {
      this.checkAndResetDailyIntake();
      this.setupMidnightReset(); // Set up next day's reset
    }, msUntilMidnight);
  }
  
  /**
   * Reset daily intake
   */
  resetDailyIntake() {
    this.totalIntake = 0;
    localStorage.setItem(this.intakeKey, this.totalIntake);
    this.updateDisplay();
    this.refreshHistory();
  }
  
  /**
   * Show daily history (weekly summary)
   */
  showDailyHistory() {
    if (!this.elements.dailyHistoryTab) return;
    
    this.elements.dailyHistoryTab.innerHTML = '';
    const fragment = document.createDocumentFragment();
    
    // Sort dates (most recent first) and limit to 7 days
    const dates = Object.keys(this.dailyHistory).sort((a, b) => {
      // Since date format is now YYYY-MM-DD, we can sort directly
      return b.localeCompare(a);
    }).slice(0, 7);
    
    if (dates.length === 0) {
      const noData = document.createElement('p');
      noData.textContent = 'No history data available.';
      fragment.appendChild(noData);
    } else {
      dates.forEach(date => {
        const entries = this.dailyHistory[date];
        const totalAmount = entries.reduce((sum, entry) => sum + entry.amount, 0);
        
        const dayEntry = document.createElement('div');
        dayEntry.className = 'day-entry';
        
        const dateText = document.createElement('p');
        dateText.innerHTML = `<b>${date}</b>`;
        dayEntry.appendChild(dateText);
        
        const totalText = document.createElement('p');
        totalText.textContent = `Total: ${totalAmount} ${this.unit}`;
        dayEntry.appendChild(totalText);
        
        const goalPercent = document.createElement('p');
        const percentage = this.goal > 0 ? Math.round((totalAmount / this.goal) * 100) : 0;
        goalPercent.textContent = `${percentage}% of daily goal`;
        dayEntry.appendChild(goalPercent);
        
        fragment.appendChild(dayEntry);
      });
    }
    
    this.elements.dailyHistoryTab.appendChild(fragment);
    this.elements.dailyHistoryTab.classList.add('active');
    
    if (this.elements.currentIntakeTab) {
      this.elements.currentIntakeTab.classList.remove('active');
    }
  }

  /**
   * Show current day's intake details
   */
  showCurrentIntake() {
    if (!this.elements.currentIntakeTab) return;
    
    this.elements.currentIntakeTab.innerHTML = '';
    const currentDate = utils.formatDate(new Date());
    const entries = this.dailyHistory[currentDate] || [];
    
    const container = document.createElement('div');
    
    const header = document.createElement('h3');
    header.textContent = `Today's ${this.type.charAt(0).toUpperCase() + this.type.slice(1)} Intake`;
    container.appendChild(header);
    
    if (entries.length === 0) {
      const noEntries = document.createElement('p');
      noEntries.textContent = `No ${this.type} intake recorded today.`;
      container.appendChild(noEntries);
    } else {
      const total = entries.reduce((sum, entry) => sum + entry.amount, 0);
      
      const remaining = this.goal > total ? this.goal - total : 0;
      const remainingInfo = document.createElement('p');
      remainingInfo.innerHTML = `Remaining: <b>${remaining} ${this.unit}</b>`;
      container.appendChild(remainingInfo);
      
      const entriesHeader = document.createElement('h4');
      entriesHeader.textContent = 'Individual Entries:';
      container.appendChild(entriesHeader);
      
      const entriesList = document.createElement('ul');
      
      entries.forEach((entry, index) => {
        const entryItem = document.createElement('li');
        const time = new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        entryItem.textContent = `${time}: ${entry.amount} ${this.unit}`;
        entriesList.appendChild(entryItem);
      });
      
      container.appendChild(entriesList);
    }
    
    this.elements.currentIntakeTab.appendChild(container);
  }
  
  /**
   * Reset all data for this tracker
   */
  resetAllData() {
    localStorage.removeItem(this.goalKey);
    localStorage.removeItem(this.intakeKey);
    localStorage.removeItem(this.historyKey);
    localStorage.removeItem(this.lastResetKey);
    
    utils.showToast(`All ${this.type} tracking data has been reset.`, 'warning');
    
    // Reload the page to reset all instances
    setTimeout(() => location.reload(), 1500);
  }
}