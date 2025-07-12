/**
 * Health & Habit Tracker App - Habits Functionality
 * This file contains the implementation of the habits tracker functionality
 */

/**
 * HabitsTracker class for tracking daily habits
 */
class HabitsTracker {
  /**
   * Create a new habits tracker - FIXED VERSION
   */
  constructor() {
    try {
      // Define storage keys
      this.habitsKey = 'habits_data';
      this.lastResetKey = `${STORAGE_KEYS.LAST_RESET_PREFIX}habits`;
      
      // Initialize variables
      this.habits = [];
      this.selectedColor = 'default';
      this.longPressTimer = null;
      this.currentHabitIndex = -1;
      this.DAYS_TO_SHOW = 4;
      this.isRearranging = false;
      this.dragSrcElement = null;
      this.dragSrcIndex = null;
      this.isEditing = false;
      this.currentCalendarMonth = new Date();
      this.isCalendarEditing = false;
      this.months = [];
      this.currentDateOffset = 0;
      this.selectedTimePeriod = 'weekly'; // Default selected time period
      
      // For touch event handling
      this.longPressContext = null;
      this.touchOrigin = null;
      this.touchMoveHandler = null;
      
      console.log('HabitsTracker: Starting initialization...');
      
      // Load habits data
      this.loadHabits();
      
      // Initialize UI elements with error handling
      try {
        this.initElements();
      } catch (elemError) {
        console.warn('Element initialization failed:', elemError);
      }
      
      // CRITICAL: Always set up modal regardless of other failures
      this.ensureModalWorks();
      
      // Initialize event listeners
      this.initEventListeners();
      
      // Set up core functionality
      this.updateDateSelector();
      this.renderHabits();
      
      // Initialize midnight reset
      this.setupMidnightReset();
      
      // Enhanced touch events (with error handling)
      try {
        this.enhanceTouchEvents();
      } catch (touchError) {
        console.warn('Touch events setup failed:', touchError);
      }
      
      console.log('HabitsTracker: Initialization complete');
      
    } catch (error) {
      console.error('HabitsTracker initialization failed:', error);
      // Fallback: ensure modal still works
      this.ensureModalWorks();
    }
  }
  
  /**
   * CRITICAL: Ensure modal always works - NEW METHOD
   */
  ensureModalWorks() {
    // Wait for DOM to be ready
    setTimeout(() => {
      const modal = document.getElementById('add-habit-modal');
      const addBtn = document.getElementById('habits-add-button');
      
      if (!modal || !addBtn) {
        console.warn('Modal or add button missing - creating fallback');
        return;
      }
      
      // Ensure modal is positioned correctly
      modal.style.position = 'fixed';
      modal.style.zIndex = '10000';
      modal.style.top = '0';
      modal.style.left = '0';
      modal.style.width = '100vw';
      modal.style.height = '100vh';
      
      // Set up guaranteed working event listeners
      this.setupModalEventListeners();
      
    }, 100);
  }

  /**
   * Guaranteed modal setup - NEW METHOD
   */
  setupModalEventListeners() {
    const addBtn = document.getElementById('habits-add-button');
    const editBtn = document.getElementById('habits-edit-button');
    const modal = document.getElementById('add-habit-modal');
    
    if (addBtn && modal) {
      // Remove any conflicting listeners
      const newAddBtn = addBtn.cloneNode(true);
      addBtn.parentNode.replaceChild(newAddBtn, addBtn);
      
      newAddBtn.addEventListener('click', () => {
        this.showModal(false); // false = add mode
      });
    }
    
    if (editBtn && modal) {
      const newEditBtn = editBtn.cloneNode(true);
      editBtn.parentNode.replaceChild(newEditBtn, editBtn);
      
      newEditBtn.addEventListener('click', () => {
        this.showModal(true); // true = edit mode
      });
    }
  }

  /**
   * Unified modal display method - NEW METHOD
   */
  showModal(isEditMode = false) {
    const modal = document.getElementById('add-habit-modal');
    if (!modal) return;
    
    // Set mode
    this.isEditing = isEditMode;
    
    if (isEditMode) {
      // Edit mode
      const habit = this.habits[this.currentHabitIndex];
      if (!habit) return;
      
      document.getElementById('modal-title').textContent = 'Edit Habit';
      document.getElementById('habit-name-input').value = habit.name;
      document.getElementById('habits-confirm-button').textContent = 'Save';
      this.selectColor(habit.color);
    } else {
      // Add mode
      document.getElementById('modal-title').textContent = 'Add New Habit';
      document.getElementById('habit-name-input').value = '';
      document.getElementById('habits-confirm-button').textContent = 'Add';
      this.selectColor('default');
    }
    
    // Show modal
    modal.style.display = 'flex';
    
    // Focus input
    setTimeout(() => {
      document.getElementById('habit-name-input').focus();
    }, 100);
  }
  
  /**
   * Initialize DOM elements
   */
  initElements() {
    // Main views
    this.mainView = document.getElementById('habits-main-view');
    this.detailView = document.getElementById('habits-detail-view');
    
    // Main elements
    this.habitsContainer = document.getElementById('habits-container');
    this.dateSelector = document.getElementById('habits-date-selector');
    
    // Modal elements
    this.addHabitModal = document.getElementById('add-habit-modal');
    this.habitNameInput = document.getElementById('habit-name-input');
    this.modalTitle = document.getElementById('modal-title');
    this.confirmButton = document.getElementById('habits-confirm-button');
    
    // Detail view elements
    this.habitDetailTitle = document.getElementById('habit-detail-title');
    this.habitChart = document.getElementById('habit-chart');
    this.chartLabels = document.getElementById('habits-chart-labels');
    this.calendarScrollContent = document.getElementById('habits-calendar-scroll-content');
    this.habitStreaks = document.getElementById('habit-streaks');
  }
  
  /**
   * Initialize event listeners - FIXED VERSION
   */
  initEventListeners() {
    // Button event listeners - using new modal system
    document.getElementById('habits-add-button').addEventListener('click', () => this.showModal(false));
    document.getElementById('habits-rearrange-button').addEventListener('click', () => this.toggleRearrange());
    document.getElementById('habits-cancel-button').addEventListener('click', () => this.closeModal());
    document.getElementById('habits-confirm-button').addEventListener('click', () => this.handleModalConfirm());
    document.getElementById('habits-back-button').addEventListener('click', () => this.showMainView());
    
    // Color selection
    document.querySelectorAll('.habits-color-option').forEach(option => {
      option.addEventListener('click', () => this.selectColor(option.dataset.color));
    });
    
    // Enter key on input
    this.habitNameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.handleModalConfirm();
      }
    });
    
    // Close modal when clicking backdrop
    const modal = document.getElementById('add-habit-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeModal();
        }
      });
    }
    
    // Add time period selector event listener
    const timePeriodSelector = document.getElementById('graph-time-period');
    if (timePeriodSelector) {
      timePeriodSelector.addEventListener('change', (e) => {
        this.selectedTimePeriod = e.target.value;
        // Re-render the chart with the new time period if a habit is selected
        if (this.currentHabitIndex >= 0) {
          this.renderChart(this.habits[this.currentHabitIndex]);
        }
      });
    }
  }
  
  /**
   * Enhanced touch event handling for better mobile experience
   */
  enhanceTouchEvents() {
    // Create a passive touchstart listener for scrolling
    document.addEventListener('touchstart', (e) => {
      // Only prevent default on our habit day elements
      if (e.target.closest('.habit-day')) {
        // Prevent text selection during longpress
        e.preventDefault();
      }
    }, { passive: false });
    
    // Block context menu on habit days
    document.addEventListener('contextmenu', (e) => {
      if (e.target.closest('.habit-day')) {
        e.preventDefault();
      }
    });
    
    // Clear any ongoing longpress when page is scrolled
    document.addEventListener('scroll', () => {
      this.endLongPress();
    }, { passive: true });
    
    // Handle orientation changes
    window.addEventListener('orientationchange', () => {
      // Recalculate layout after orientation change
      setTimeout(() => {
        this.updateDateSelector();
        this.renderHabits();
      }, 300);
    });
  }
  
  /**
   * Get date key for storage
   * @param {Date} date - Date to format
   * @returns {string} Formatted date
   */
  getDateKey(date) {
    return utils.formatDate(date);
  }
  
/**
 * Update date selector with days to show
 */
updateDateSelector() {
  if (!this.dateSelector) return;
  
  this.dateSelector.innerHTML = '';
  
  // Create date-navigation container with fixed width
  const navContainer = document.createElement('div');
  navContainer.className = 'date-navigation';
  
  // Add 'show-navigation' class if we've navigated away from today
  if (this.currentDateOffset > 0) {
    navContainer.classList.add('show-navigation');
  }
  
  // Create back button
  const backButton = document.createElement('button');
  backButton.className = 'date-nav-button date-nav-back';
  backButton.innerHTML = '&lt;';
  backButton.title = "Show earlier dates";
  backButton.addEventListener('click', () => {
    this.currentDateOffset += this.DAYS_TO_SHOW;
    // Add the show-navigation class to reveal other buttons
    document.querySelector('.date-navigation').classList.add('show-navigation');
    this.updateDateSelector();
    this.renderHabits();
  });
  
  // Create "Today" button - masked initially
  const todayButton = document.createElement('button');
  todayButton.className = 'date-nav-button today-button';
  todayButton.textContent = 'Today';
  todayButton.title = "Return to today";
  todayButton.addEventListener('click', () => {
    this.currentDateOffset = 0;
    // Remove the show-navigation class when returning to today
    document.querySelector('.date-navigation').classList.remove('show-navigation');
    this.updateDateSelector();
    this.renderHabits();
  });
  
  // Create forward button - masked initially, and disabled when on latest dates
  const forwardButton = document.createElement('button');
  forwardButton.className = 'date-nav-button date-nav-forward';
  forwardButton.innerHTML = '&gt;';
  forwardButton.title = "Show later dates";
  
  // Disable forward button when on latest dates
  if (this.currentDateOffset <= 0) {
    forwardButton.disabled = true;
    forwardButton.classList.add('disabled');
  }
  
  forwardButton.addEventListener('click', () => {
    this.currentDateOffset = Math.max(0, this.currentDateOffset - this.DAYS_TO_SHOW);
    
    // If we've returned to today, hide navigation
    if (this.currentDateOffset === 0) {
      document.querySelector('.date-navigation').classList.remove('show-navigation');
    }
    
    this.updateDateSelector();
    this.renderHabits();
  });
  
  // Add all buttons to navigation container
  navContainer.appendChild(backButton);
  navContainer.appendChild(todayButton);
  navContainer.appendChild(forwardButton);
  
  // Create wrapper for navigation and dates
  const dateDisplayWrapper = document.createElement('div');
  dateDisplayWrapper.className = 'date-display-wrapper';
  
  // Create dates container
  const datesContainer = document.createElement('div');
  datesContainer.className = 'dates-container';
  
  // Calculate dates based on offset
  const today = new Date();
  
  for (let i = this.DAYS_TO_SHOW - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i - this.currentDateOffset);
    
    const dateElement = document.createElement('div');
    dateElement.className = 'date-item';
    
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    dateElement.innerHTML = `
      <div class="day-name">${days[date.getDay()]}</div>
      <div class="day-number">${date.getDate()}</div>
    `;
    
    datesContainer.appendChild(dateElement);
  }
  
  // Add date navigation and dates to the wrapper
  dateDisplayWrapper.appendChild(navContainer);
  dateDisplayWrapper.appendChild(datesContainer);
  
  // Add wrapper to main selector
  this.dateSelector.appendChild(dateDisplayWrapper);
  
  // Ensure equal width distribution of date items to match habit days
  this.alignDateItemsWithHabitDays();
}

/**
 * Align date items with habit days for perfect alignment
 */
alignDateItemsWithHabitDays() {
  // Using setTimeout to ensure the DOM has been updated
  setTimeout(() => {
    const dateItems = document.querySelectorAll('.date-item');
    const habitDays = document.querySelectorAll('.habit-day');
    
    if (dateItems.length > 0 && habitDays.length > 0) {
      // Get the first habit's days for measurements
      const firstHabitDays = Array.from(habitDays).slice(0, this.DAYS_TO_SHOW);
      
      // Apply widths to match
      dateItems.forEach((item, index) => {
        if (firstHabitDays[index]) {
          const habitDayWidth = firstHabitDays[index].offsetWidth;
          item.style.width = `${habitDayWidth}px`;
        }
      });
    }
  }, 0);
}

  /**
   * Load habits from localStorage
   */
  loadHabits() {
    const storedHabits = localStorage.getItem(this.habitsKey);
    if (storedHabits) {
      this.habits = JSON.parse(storedHabits);
      this.habits.forEach(habit => {
        if (!habit.history) habit.history = {};
      });
    } else {
      // Create default habits list with empty history
      this.habits = [
        { name: 'Start a Habit', color: 'default', history: {} }
      ];
    }
  }
  
  /**
   * Save habits to localStorage with storage quota handling
   */
  saveHabits() {
    // Check if we're low on storage space
    if (storageManager && storageManager.isNearQuota && storageManager.isNearQuota()) {
      // Try to clean up old data
      const cleaned = storageManager.cleanupOldData();
      
      if (!cleaned) {
        utils.showToast('Storage space is running low. Old habit history may be archived.', 'warning');
        
        // Keep only last 30 days of history for each habit
        this.habits.forEach(habit => {
          if (habit.history) {
            const dates = Object.keys(habit.history).sort();
            if (dates.length > 30) {
              const datesToRemove = dates.slice(0, dates.length - 30);
              datesToRemove.forEach(date => {
                delete habit.history[date];
              });
            }
          }
        });
      }
    }
    
    try {
      localStorage.setItem(this.habitsKey, JSON.stringify(this.habits));
    } catch (error) {
      // Handle storage errors
      if (error.name === 'QuotaExceededError' || 
          error.name === 'NS_ERROR_DOM_QUOTA_REACHED' || 
          error.code === 22) {
        utils.showToast('Not enough storage space. Some habit history may be lost.', 'error');
        
        // Aggressive cleanup - remove all history except current month
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        this.habits.forEach(habit => {
          if (habit.history) {
            Object.keys(habit.history).forEach(dateKey => {
              const date = new Date(dateKey);
              if (date.getMonth() !== currentMonth || date.getFullYear() !== currentYear) {
                delete habit.history[dateKey];
              }
            });
          }
        });
        
        // Try again
        try {
          localStorage.setItem(this.habitsKey, JSON.stringify(this.habits));
        } catch (error2) {
          // Last resort - only keep today's data
          const today = utils.formatDate(new Date());
          
          this.habits.forEach(habit => {
            const todayStatus = habit.history && habit.history[today];
            habit.history = {};
            if (todayStatus) {
              habit.history[today] = todayStatus;
            }
          });
          
          try {
            localStorage.setItem(this.habitsKey, JSON.stringify(this.habits));
            utils.showToast('Storage space critically low. Only today\'s data kept.', 'error');
          } catch (error3) {
            utils.showToast('Unable to save habits data. Please export your data.', 'error');
          }
        }
      } else {
        utils.showToast(`Error saving habits: ${error.message}`, 'error');
      }
    }
  }
  
  /**
   * Enhanced long press handling with better touch support
   */
  startLongPress(habitIndex, dateKey, event, element) {
    // Clear any previous longpress
    this.endLongPress();
    
    // Store context for cleanup
    this.longPressContext = {
      element: element,
      timer: null
    };
    
    // Add visual feedback
    element.classList.add('longpress');
    
    // Set touch origin for better UX
    if (event.type === 'touchstart' && event.touches && event.touches[0]) {
      this.touchOrigin = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
      };
    }
    
    // Prevent text selection during longpress
    if (event.preventDefault) {
      event.preventDefault();
    }
    
    // Add touchmove listener to detect movement and cancel longpress if needed
    const touchMoveHandler = (moveEvent) => {
      if (moveEvent.touches && moveEvent.touches[0] && this.touchOrigin) {
        const touch = moveEvent.touches[0];
        const deltaX = Math.abs(touch.clientX - this.touchOrigin.x);
        const deltaY = Math.abs(touch.clientY - this.touchOrigin.y);
        
        // If moved more than 10px, cancel longpress
        if (deltaX > 10 || deltaY > 10) {
          this.endLongPress();
          document.removeEventListener('touchmove', touchMoveHandler);
        }
      }
    };
    
    document.addEventListener('touchmove', touchMoveHandler);
    
    // Store reference for cleanup
    this.touchMoveHandler = touchMoveHandler;
    
    // Start longpress timer
    this.longPressContext.timer = setTimeout(() => {
      // Get the habit
      const habit = this.habits[habitIndex];
      if (!habit) return;
      
      // Ensure history object exists
      if (!habit.history) habit.history = {};
      
      // Toggle status
      const currentStatus = habit.history[dateKey] || 'fail';
      const newStatus = currentStatus === 'fail' ? 'done' : 'fail';
      habit.history[dateKey] = newStatus;
      
      // Update the cell appearance directly instead of re-rendering
      if (newStatus === 'done') {
        element.classList.remove('fail');
        element.classList.add('done', habit.color);
        element.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
      } else {
        element.classList.remove('done', habit.color);
        element.classList.add('fail');
        element.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
      }
      
      // Save changes
      this.saveHabits();
      
      // Add haptic feedback if available
      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(50); // Short vibration for feedback
      }
      
      // Clean up event listeners
      document.removeEventListener('touchmove', touchMoveHandler);
      
      // Add a slight delay before removing visual feedback
      setTimeout(() => {
        if (element) {
          element.classList.remove('longpress');
        }
      }, 200);
    }, 600); // Slightly longer delay for better UX (600ms instead of 500ms)
  }
  
  /**
   * Enhanced end long press with better cleanup
   */
  endLongPress(event) {
    // Prevent default if event exists
    if (event && event.preventDefault) {
      event.preventDefault();
    }
    
    // Clear timer
    if (this.longPressContext && this.longPressContext.timer) {
      clearTimeout(this.longPressContext.timer);
      this.longPressContext.timer = null;
    }
    
    // Remove visual feedback
    if (this.longPressContext && this.longPressContext.element) {
      this.longPressContext.element.classList.remove('longpress');
    }
    
    // Clean up touchmove listener
    if (this.touchMoveHandler) {
      document.removeEventListener('touchmove', this.touchMoveHandler);
      this.touchMoveHandler = null;
    }
    
    // Reset context
    this.longPressContext = null;
    this.touchOrigin = null;
  }
  
  /**
   * Handle click events on habit days (separate from longpress)
   * This allows for accessibility with standard clicks too
   */
  handleHabitDayClick(habitIndex, dateKey, element) {
    // Only trigger on regular clicks, not as part of longpress
    if (this.longPressTimer) return;
    
    const habit = this.habits[habitIndex];
    if (!habit) return;
    
    // For standard clicks, implement different behavior - just toggle
    if (!habit.history) habit.history = {};
    
    const currentStatus = habit.history[dateKey] || 'fail';
    const newStatus = currentStatus === 'fail' ? 'done' : 'fail';
    habit.history[dateKey] = newStatus;
    
    // Update the UI directly
    if (newStatus === 'done') {
      element.classList.remove('fail');
      element.classList.add('done', habit.color);
      element.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    } else {
      element.classList.remove('done', habit.color);
      element.classList.add('fail');
      element.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    }
    
    // Save changes
    this.saveHabits();
  }
  
  /**
   * Modified function for rendering habits to use new event handling
   */
  renderHabits() {
    if (!this.habitsContainer) return;
    
    this.habitsContainer.innerHTML = '';
    this.habitsContainer.className = this.isRearranging ? 'rearranging' : '';
    
    // Handle empty habits
    if (this.habits.length === 0) {
      const emptyMessage = document.createElement('div');
      emptyMessage.className = 'empty-habits-message';
      emptyMessage.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: var(--text-secondary);">
          <p style="font-size: 18px; margin-bottom: 20px;">No habits yet</p>
          <p style="font-size: 14px; margin-bottom: 30px;">Tap the + button to add your first habit</p>
          <button class="action-btn habits" 
                  style="display: inline-block; font-size: 16px;"
                  onclick="window.habitsTracker.showModal(false)">
              Add Habit
          </button>
        </div>
      `;
      this.habitsContainer.appendChild(emptyMessage);
      return;
    }
    
    // Create habit elements
    this.habits.forEach((habit, index) => {
      const habitElement = document.createElement('div');
      habitElement.className = `habit-item ${habit.color}`;
      habitElement.setAttribute('data-index', index);
      
      if (this.isRearranging) {
        habitElement.setAttribute('draggable', 'true');
        habitElement.addEventListener('dragstart', e => this.handleDragStart(e, habitElement, index));
        habitElement.addEventListener('dragover', e => this.handleDragOver(e, habitElement));
        habitElement.addEventListener('dragleave', e => this.handleDragLeave(e, habitElement));
        habitElement.addEventListener('drop', e => this.handleDrop(e, habitElement, index));
        habitElement.addEventListener('dragend', e => this.handleDragEnd(e, habitElement));
      }
      
      // Build habit grid
      let habitGrid = '';
      const today = new Date();
      
      for (let i = this.DAYS_TO_SHOW - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i - this.currentDateOffset);
        const dateKey = this.getDateKey(date);
        
        const status = habit.history[dateKey] || 'fail';
        
        let className = 'fail';
        let symbol = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
        
        if (status === 'done') {
          symbol = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
          className = `done ${habit.color}`;
        }
        
        habitGrid += `
          <div class="habit-day ${className}" 
               data-date="${dateKey}"
               data-habit="${index}"
               role="button"
               tabindex="0"
               aria-label="${status === 'done' ? 'Completed' : 'Not completed'} on ${date.toLocaleDateString()}">
            ${symbol}
          </div>
        `;
      }
      
      habitElement.innerHTML = `
        <div class="habit-name-section">
          <div class="drag-handle">⋮⋮⋮</div>
          <div class="circle"></div>
          <div class="name">${habit.name}</div>
        </div>
        <div class="habit-grid-section">
          <div class="habit-grid">${habitGrid}</div>
        </div>
      `;
      
      this.habitsContainer.appendChild(habitElement);
    });
    
    // Add event listeners for habit names and days
    if (!this.isRearranging) {
      document.querySelectorAll('.habit-name-section .name').forEach((nameElement, index) => {
        nameElement.addEventListener('click', () => this.showHabitDetail(index));
        
        // Add keyboard accessibility
        nameElement.setAttribute('tabindex', '0');
        nameElement.setAttribute('role', 'button');
        nameElement.setAttribute('aria-label', `View details for ${this.habits[index].name}`);
        nameElement.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.showHabitDetail(index);
          }
        });
      });
      
      document.querySelectorAll('.habit-day').forEach(dayElement => {
        const habitIndex = parseInt(dayElement.dataset.habit);
        const dateKey = dayElement.dataset.date;
        
        // Touch events for longpress
        dayElement.addEventListener('touchstart', (e) => this.startLongPress(habitIndex, dateKey, e, dayElement));
        dayElement.addEventListener('touchend', (e) => this.endLongPress(e));
        dayElement.addEventListener('touchcancel', (e) => this.endLongPress(e));
        
        // Mouse events for longpress
        dayElement.addEventListener('mousedown', (e) => this.startLongPress(habitIndex, dateKey, e, dayElement));
        dayElement.addEventListener('mouseup', (e) => this.endLongPress(e));
        dayElement.addEventListener('mouseleave', (e) => this.endLongPress(e));
        
        // Keyboard accessibility
        dayElement.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.handleHabitDayClick(habitIndex, dateKey, dayElement);
          }
        });
      });
    }
  }
  
  /**
   * Close modal
   */
  closeModal() {
    const modal = document.getElementById('add-habit-modal');
    if (modal) {
      modal.style.display = 'none';
    }
    this.selectedColor = 'default';
    this.isEditing = false;
  }
  
  /**
   * Select color for habit
   * @param {string} color - Color to select
   */
  selectColor(color) {
    this.selectedColor = color;
    document.querySelectorAll('.habits-color-option').forEach(option => {
      option.classList.remove('selected');
      if (option.dataset.color === color) {
        option.classList.add('selected');
      }
    });
  }
  
  /**
   * Handle modal confirm button click
   */
  handleModalConfirm() {
    if (this.isEditing) {
      this.editHabit();
    } else {
      this.addHabit();
    }
  }
  
  /**
   * Add a new habit
   */
  addHabit() {
    const habitName = this.habitNameInput.value.trim();
    
    if (!habitName) {
      utils.showToast('Please enter a habit name', 'error');
      return;
    }
    
    this.habits.push({
      name: habitName,
      color: this.selectedColor,
      history: {}
    });
    
    this.saveHabits();
    this.renderHabits();
    this.closeModal();
  }
  
  /**
   * Edit existing habit
   */
  editHabit() {
    const habitName = this.habitNameInput.value.trim();
    
    if (!habitName) {
      utils.showToast('Please enter a habit name', 'error');
      return;
    }
    
    this.habits[this.currentHabitIndex].name = habitName;
    this.habits[this.currentHabitIndex].color = this.selectedColor;
    
    this.saveHabits();
    this.closeModal();
    this.showHabitDetail(this.currentHabitIndex);
  }
  
  /**
   * Toggle rearrange mode
   */
  toggleRearrange() {
    this.isRearranging = !this.isRearranging;
    
    // Toggle active class on rearrange button
    const rearrangeButton = document.getElementById('habits-rearrange-button');
    if (rearrangeButton) {
      if (this.isRearranging) {
        rearrangeButton.classList.add('active');
      } else {
        rearrangeButton.classList.remove('active');
      }
    }
    
    this.renderHabits();
  }
  
  /**
   * Handle drag start event
   * @param {Event} e - Event object
   * @param {Element} element - Element being dragged
   * @param {number} index - Index of the habit
   */
  handleDragStart(e, element, index) {
    this.dragSrcElement = element;
    this.dragSrcIndex = index;
    
    // Firefox needs data to be set
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index);
    
    element.classList.add('dragging');
    
    // Make it work in Firefox
    setTimeout(() => {
      element.style.opacity = '0.5';
    }, 0);
  }
  
  /**
   * Handle drag over event
   * @param {Event} e - Event object
   * @param {Element} element - Element being dragged over
   */
  handleDragOver(e, element) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    element.classList.add('drag-over');
    return false;
  }
  
  /**
   * Handle drag leave event
   * @param {Event} e - Event object
   * @param {Element} element - Element being dragged from
   */
  handleDragLeave(e, element) {
    element.classList.remove('drag-over');
  }
  
  /**
   * Handle drop event
   * @param {Event} e - Event object
   * @param {Element} element - Element being dropped on
   * @param {number} index - Index of the habit
   */
  handleDrop(e, element, index) {
    e.preventDefault();
    e.stopPropagation();
    
    element.classList.remove('drag-over');
    
    if (this.dragSrcElement !== element) {
      const dropIndex = index;
      
      // Reorder habits array
      const draggedHabit = this.habits[this.dragSrcIndex];
      this.habits.splice(this.dragSrcIndex, 1);
      this.habits.splice(dropIndex, 0, draggedHabit);
      
      this.saveHabits();
      this.renderHabits();
    }
    
    return false;
  }
  
  /**
   * Handle drag end event
   * @param {Event} e - Event object
   * @param {Element} element - Element that was dragged
   */
  handleDragEnd(e, element) {
    element.classList.remove('dragging');
    element.style.opacity = '1';
    
    // Clean up
    document.querySelectorAll('.habit-item').forEach(item => {
      item.classList.remove('drag-over');
    });
  }
  
  /**
   * Show habit detail view - FIXED VERSION
   */
  showHabitDetail(index) {
    this.currentHabitIndex = index;
    const habit = this.habits[index];
    this.currentCalendarMonth = new Date();
    this.isCalendarEditing = false;
    
    // Update UI visibility
    this.mainView.style.display = 'none';
    this.detailView.style.display = 'block';
    
    // Set habit title
    this.habitDetailTitle.textContent = habit.name;
    
    // Apply color theme
    this.applyColorThemeToDetailView(habit.color);
    
    // Make sure delete button has proper event listener
    const deleteButton = document.getElementById('habits-delete-button');
    if (deleteButton) {
      // Clone and replace to clear any old event listeners
      const newDeleteButton = deleteButton.cloneNode(true);
      deleteButton.parentNode.replaceChild(newDeleteButton, deleteButton);
      
      // Add fresh event listener
      newDeleteButton.addEventListener('click', () => {
        this.deleteCurrentHabit();
      });
    }
    
    // Make sure edit button has proper event listener - using new modal system
    const editButton = document.getElementById('habits-edit-button');
    if (editButton) {
      // Clone and replace to clear any old event listeners
      const newEditButton = editButton.cloneNode(true);
      editButton.parentNode.replaceChild(newEditButton, editButton);
      
      // Add fresh event listener using new modal system
      newEditButton.addEventListener('click', () => {
        this.showModal(true); // true = edit mode
      });
    }
    
    // Initialize calendar edit button
    const calendarEditButton = document.getElementById('habits-edit-calendar-button');
    if (calendarEditButton) {
      // Clone and replace to clear any old event listeners
      const newCalendarEditButton = calendarEditButton.cloneNode(true);
      calendarEditButton.parentNode.replaceChild(newCalendarEditButton, calendarEditButton);
      
      // Add fresh event listener
      newCalendarEditButton.addEventListener('click', () => {
        this.toggleCalendarEdit();
      });
    }
    
    // Set time period selector to match the current selection
    const timePeriodSelector = document.getElementById('graph-time-period');
    if (timePeriodSelector) {
      timePeriodSelector.value = this.selectedTimePeriod;
    }
    
    // Render visualizations
    this.renderChart(habit);
    this.renderCalendar(habit);
    this.renderStreaks(habit);
  }
  
  /**
   * Apply color theme to detail view
   * @param {string} color - Color to apply
   */
  applyColorThemeToDetailView(color) {
    // Reset to default first
    this.habitDetailTitle.style.color = 'white';
    document.querySelectorAll('.habits-section-title').forEach(title => {
      title.className = 'habits-section-title';
    });
    
    // Apply specific color if not default
    if (color !== 'default') {
      const colorHex = this.getColorHex(color);
      this.habitDetailTitle.style.color = colorHex;
      document.querySelectorAll('.habits-section-title').forEach(title => {
        title.className = `habits-section-title ${color}`;
      });
      
      // Apply color to buttons
      const buttons = [
        document.getElementById('habits-edit-button'),
        document.getElementById('habits-delete-button'),
        document.getElementById('habits-back-button')
      ];
      
      buttons.forEach(button => {
        if (button) {
          button.className = 'icon-btn';
          button.classList.add(color);
        }
      });
    }
  }
  
  /**
   * Calculate consistency score for a habit
   * @param {Object} history - Habit history
   * @param {Date} endDate - End date for calculation (usually current date)
   * @param {number} days - Number of days to look back
   * @returns {number} - Consistency score (0-100)
   */
  calculateConsistencyScore(history, endDate, days = 30) {
    // Initialize score
    let score = 0;
    const today = new Date(endDate);
    
    // Define weight factors
    const recentWeight = 1.5;  // Recent days matter more
    const streakBonus = 5;     // Bonus points for consecutive days
    const maxScore = 100;      // Maximum possible score
    const basePoints = 70;     // Base points for a completed day
    const decayRate = 0.9;     // How quickly score decays on missed days
    
    // Keep track of streak
    let currentStreak = 0;
    let maxStreakInPeriod = 0;
    
    // Calculate score for each day in the period
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateKey = this.getDateKey(date);
      
      // Weight factor decreases as we go further back in time
      const dayWeight = (days - i) / days * (i < 7 ? recentWeight : 1);
      
      // Check if activity was done on this day
      const isDone = history[dateKey] === 'done';
      
      if (isDone) {
        // Add points for completed day
        score += basePoints * dayWeight;
        
        // Update streak
        currentStreak++;
        maxStreakInPeriod = Math.max(maxStreakInPeriod, currentStreak);
        
        // Add streak bonus
        if (currentStreak > 1) {
          score += Math.min(streakBonus * currentStreak, 30) * dayWeight;
        }
      } else {
        // Reset streak
        currentStreak = 0;
        
        // Decay score for missed days
        score *= decayRate;
      }
    }
    
    // Normalize score to 0-100 range
    let normalizedScore = Math.min(Math.round(score / days), maxScore);
    
    // Add bonus for max streak achieved in period
    if (maxStreakInPeriod > 3) {
      normalizedScore += Math.min(streakBonus * maxStreakInPeriod / 2, 15);
    }
    
    // Ensure final score is within 0-100 range
    return Math.min(Math.max(Math.round(normalizedScore), 0), maxScore);
  }
  
  /**
   * Get consistency data points by time period
   * @param {Object} habit - Habit object
   * @returns {Array} - Array of data points with dates and consistency scores
   */
  getConsistencyDataByTimePeriod(habit) {
    const today = new Date();
    let dataPoints = [];
    
    switch (this.selectedTimePeriod) {
      case 'weekly':
        // Last 7 days
        for (let i = 6; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(today.getDate() - i);
          
          // Calculate consistency score for a 7-day window ending on this date
          const score = this.calculateConsistencyScore(habit.history, date, 7);
          
          dataPoints.push({
            date: date,
            value: score
          });
        }
        break;
        
      case 'monthly':
        // Last 30 days grouped by week
        for (let i = 0; i < 5; i++) {
          const date = new Date(today);
          // Go back to start at the right week
          date.setDate(today.getDate() - (4 - i) * 7);
          
          // Calculate consistency score for a 7-day window ending on this date
          const score = this.calculateConsistencyScore(habit.history, date, 7);
          
          dataPoints.push({
            date: date,
            value: score
          });
        }
        break;
        
      case 'quarterly':
        // Last 3 months by week
        for (let i = 0; i < 12; i++) {
          const date = new Date(today);
          date.setDate(today.getDate() - (11 - i) * 7);
          
          // Calculate consistency score for a 14-day window ending on this date
          const score = this.calculateConsistencyScore(habit.history, date, 14);
          
          dataPoints.push({
            date: date,
            value: score
          });
        }
        break;
        
      case 'yearly':
        // Last 12 months
        for (let i = 0; i < 12; i++) {
          const date = new Date(today);
          date.setMonth(today.getMonth() - (11 - i));
          
          // Calculate consistency score for a 30-day window ending on this date
          const score = this.calculateConsistencyScore(habit.history, date, 30);
          
          dataPoints.push({
            date: date,
            value: score
          });
        }
        break;
        
      default:
        // Default to weekly view
        for (let i = 6; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(today.getDate() - i);
          
          // Calculate consistency score for a 7-day window ending on this date
          const score = this.calculateConsistencyScore(habit.history, date, 7);
          
          dataPoints.push({
            date: date,
            value: score
          });
        }
    }
    
    return dataPoints;
  }
  
  /**
   * Render chart with consistency scores
   * @param {Object} habit - Habit object to render chart for
   */
  renderChart(habit) {
    const chartContainer = this.habitChart;
    if (!chartContainer) return;
    
    // Clear existing content except labels
    const yLabels = chartContainer.querySelector('.habits-chart-y-labels');
    const axis = chartContainer.querySelector('.habits-chart-axis');
    chartContainer.innerHTML = '';
    if (yLabels) chartContainer.appendChild(yLabels);
    if (axis) chartContainer.appendChild(axis);
    
    // Get data based on selected time period with consistency scores
    const dataPoints = this.getConsistencyDataByTimePeriod(habit);
    
    // Check if chart container is visible
    if (chartContainer.offsetWidth === 0) {
      setTimeout(() => this.renderChart(habit), 100);
      return;
    }
    
    // Update y-axis labels to show consistency score range (0-100)
    this.updateYAxisLabels(100);
    
    // Calculate coordinates for smooth curve
    const pathPoints = this.calculateSmoothCurve(dataPoints, chartContainer, 100);
    
    // Create SVG path for smooth line
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.style.position = "absolute";
    svg.style.top = "0";
    svg.style.left = "0";
    
    // Create path element
    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", pathPoints);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", this.getColorHex(habit.color));
    path.setAttribute("stroke-width", "2");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    svg.appendChild(path);
    chartContainer.appendChild(svg);
    
    // Render data points
    dataPoints.forEach((point, index) => {
      const x = 40 + (index / (dataPoints.length - 1)) * (chartContainer.offsetWidth - 50);
      const y = chartContainer.offsetHeight - (point.value / 100) * (chartContainer.offsetHeight - 20);
      
      const pointElement = document.createElement('div');
      pointElement.className = `habits-chart-point`;
      if (habit.color) {
        pointElement.classList.add(habit.color);
      }
      pointElement.style.left = `${x}px`;
      pointElement.style.top = `${y}px`;
      
      // Add tooltip with the actual score value
      pointElement.setAttribute('title', `Score: ${point.value}`);
      
      chartContainer.appendChild(pointElement);
    });
    
    // Render labels
    this.renderChartLabels(dataPoints);
  }

  /**
   * Update Y-axis labels based on data maximum
   * @param {number} maxValue - Maximum value (100 for consistency score)
   */
  updateYAxisLabels(maxValue) {
    const yLabelsContainer = this.habitChart.querySelector('.habits-chart-y-labels');
    if (!yLabelsContainer) return;
    
    // Clear existing labels
    yLabelsContainer.innerHTML = '';
    
    // Create labels with evenly distributed values
    const steps = 5; // 0, 25, 50, 75, 100
    for (let i = steps - 1; i >= 0; i--) {
      const value = Math.round(maxValue * i / (steps - 1));
      const label = document.createElement('span');
      label.textContent = value;
      yLabelsContainer.appendChild(label);
    }
  }

  /**
   * Calculate smooth curve path for SVG
   * @param {Array} points - Data points
   * @param {Element} container - Chart container
   * @param {number} maxValue - Maximum value for scaling
   * @returns {string} - SVG path data
   */
  calculateSmoothCurve(points, container, maxValue) {
    if (points.length < 2) return '';
    
    const width = container.offsetWidth;
    const height = container.offsetHeight;
    const coordinates = points.map((point, index) => {
      const x = 40 + (index / (points.length - 1)) * (width - 50);
      const y = height - (point.value / maxValue) * (height - 20);
      return [x, y];
    });
    
    // Create path data for smooth curve
    let path = `M ${coordinates[0][0]},${coordinates[0][1]}`;
    
    // Add curved segments between points
    for (let i = 0; i < coordinates.length - 1; i++) {
      const x1 = coordinates[i][0];
      const y1 = coordinates[i][1];
      const x2 = coordinates[i + 1][0];
      const y2 = coordinates[i + 1][1];
      
      // Calculate control points for smooth curve
      const cpx1 = x1 + (x2 - x1) / 3;
      const cpy1 = y1;
      const cpx2 = x1 + 2 * (x2 - x1) / 3;
      const cpy2 = y2;
      
      // Add cubic bezier curve
      path += ` C ${cpx1},${cpy1} ${cpx2},${cpy2} ${x2},${y2}`;
    }
    
    return path;
  }

  /**
   * Render chart labels for time axis
   * @param {Array} dataPoints - Data points
   */
  renderChartLabels(dataPoints) {
    if (!this.chartLabels) return;
    
    this.chartLabels.innerHTML = '';
    
    // Determine how many labels to show (reduce for smaller screens)
    const maxLabels = window.innerWidth < 400 ? 3 : dataPoints.length;
    const step = Math.ceil(dataPoints.length / maxLabels);
    
    // Add labels with proper spacing
    dataPoints.forEach((point, index) => {
      // Only show beginning, end, and some intermediate labels
      if (index === 0 || index === dataPoints.length - 1 || index % step === 0) {
        const label = document.createElement('span');
        label.textContent = this.formatDateForTimePeriod(point.date);
        this.chartLabels.appendChild(label);
      }
    });
  }

  /**
   * Format date for time period display
   * @param {Date} date - Date to format
   * @returns {string} - Formatted date string
   */
  formatDateForTimePeriod(date) {
    switch (this.selectedTimePeriod) {
      case 'weekly':
        return (date.getMonth() + 1) + '/' + date.getDate();
        
      case 'monthly':
        const weekNum = Math.ceil(date.getDate() / 7);
        return `W${weekNum}`;
        
      case 'quarterly':
        const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()];
        return `${monthShort} W${Math.ceil(date.getDate() / 7)}`;
        
      case 'yearly':
        return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()];
        
      default:
        return (date.getMonth() + 1) + '/' + date.getDate();
    }
  }

  /**
   * Get hex code for a habit color
   * @param {string} color - Color name
   * @returns {string} - Hex color code
   */
  getColorHex(color) {
    const colorMap = {
      'red': '#FF0000',
      'coral': '#FF5042',
      'pink': '#FF4A8D',
      'lightpink': '#FFC8F0',
      'purple': '#B96CDA',
      'navy': '#334C77',
      'skyblue': '#58B5F0',
      'royalblue': '#5B6EF7',
      'blue': '#2196F3',
      'teal': '#40BBD4',
      'lightblue': '#77D1F3',
      'lightgreen': '#5DD959',
      'green': '#4CAF50',
      'darkgreen': '#159D82',
      'seagreen': '#4AD6B8',
      'yellow': '#FFDE0A',
      'orange': '#FF9F29',
      'tangerine': '#FF7B29',
      'darkorange': '#E25C28',
      'gray': '#A5A5A5',
      'default': '#673AB7' // Use habits-primary as default
    };
    
    return colorMap[color] || colorMap.default;
  }
  
  /**
   * Delete current habit
   */
  deleteCurrentHabit() {
    const indexToDelete = this.currentHabitIndex;
    
    // Create confirmation modal with proper styling
    const confirmationModal = document.createElement('div');
    confirmationModal.className = 'modal';
    confirmationModal.style.display = 'flex';
    confirmationModal.style.zIndex = '1001'; // Ensure above other elements
    confirmationModal.style.position = 'fixed';
    confirmationModal.style.top = '0';
    confirmationModal.style.left = '0';
    confirmationModal.style.width = '100%';
    confirmationModal.style.height = '100%';
    confirmationModal.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    confirmationModal.style.justifyContent = 'center';
    confirmationModal.style.alignItems = 'center';
    
    confirmationModal.innerHTML = `
      <div class="modal-content" style="position: relative; max-width: 320px;">
        <div class="modal-header">Delete Habit</div>
        <p style="margin-bottom: 20px;">Are you sure you want to delete this habit?</p>
        <div class="modal-buttons">
          <button class="modal-button cancel" id="habits-cancel-delete">Cancel</button>
          <button class="modal-button confirm" style="background-color: var(--habits-primary);" id="habits-confirm-delete">Delete</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(confirmationModal);
    
    // Using direct function reference to ensure proper context
    const cancelDelete = function() {
      document.body.removeChild(confirmationModal);
    };
    
    const confirmDelete = function() {
      window.habitsTracker.habits.splice(indexToDelete, 1);
      window.habitsTracker.saveHabits();
      document.body.removeChild(confirmationModal);
      window.habitsTracker.showMainView();
    };
    
    // Add event listeners with direct function references
    document.getElementById('habits-cancel-delete').addEventListener('click', cancelDelete);
    document.getElementById('habits-confirm-delete').addEventListener('click', confirmDelete);
  }
  
  /**
   * Show main view
   */
  showMainView() {
    this.mainView.style.display = 'block';
    this.detailView.style.display = 'none';
    this.renderHabits();
  }

/**
 * Render calendar
 * @param {Object} habit - Habit object to render calendar for
 */
renderCalendar(habit) {
  if (!this.calendarScrollContent) return;
  
  this.calendarScrollContent.innerHTML = '';
  
  const today = new Date();
  this.months = [];
  
  // Generate months from current month backwards
  this.months.push({
    year: today.getFullYear(),
    month: today.getMonth(),
  });
  
  // Add past 12 months
  for (let i = 1; i <= 12; i++) {
    const pastDate = new Date(today);
    pastDate.setMonth(today.getMonth() - i);
    
    this.months.push({
      year: pastDate.getFullYear(),
      month: pastDate.getMonth(),
    });
  }
  
  // Create month containers
  this.months.forEach(({ year, month }) => {
    const monthDate = new Date(year, month, 1);
    const monthContainer = this.createMonthCalendar(habit, monthDate);
    this.calendarScrollContent.appendChild(monthContainer);
  });
  
  // Add Load More button
  const loadMoreContainer = document.createElement('div');
  loadMoreContainer.className = 'habits-load-more-container';
  
  const loadMoreButton = document.createElement('button');
  loadMoreButton.className = 'habits-load-more-button';
  loadMoreButton.textContent = 'Load More History';
  loadMoreButton.addEventListener('click', () => this.loadMorePastMonths(habit));
  
  loadMoreContainer.appendChild(loadMoreButton);
  this.calendarScrollContent.appendChild(loadMoreContainer);
  
  // Set up infinite scrolling
  this.setupInfiniteScroll(habit);
  
  // Reset scroll position to show current month
  this.calendarScrollContent.scrollLeft = 0;
  
  // Extra check with delay
  setTimeout(() => {
    this.calendarScrollContent.scrollLeft = 0;
  }, 100);
}

/**
 * Create month calendar
 * @param {Object} habit - Habit object
 * @param {Date} monthDate - Date for month to create
 * @returns {Element} - Month calendar element
 */
createMonthCalendar(habit, monthDate) {
  const monthContainer = document.createElement('div');
  monthContainer.className = 'habits-month-calendar';
  
  const currentMonth = monthDate.getMonth();
  const currentYear = monthDate.getFullYear();
  
  // Month header
  const monthHeader = document.createElement('div');
  monthHeader.className = 'habits-month-header';
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                     'July', 'August', 'September', 'October', 'November', 'December'];
  monthHeader.textContent = `${monthNames[currentMonth]} ${currentYear}`;
  monthContainer.appendChild(monthHeader);
  
  // Calendar grid
  const calendarGrid = document.createElement('div');
  calendarGrid.className = 'habits-calendar-grid';
  
  // Day labels
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  dayLabels.forEach(label => {
    const cell = document.createElement('div');
    cell.className = 'habits-calendar-cell day-label';
    cell.textContent = label;
    calendarGrid.appendChild(cell);
  });
  
  // Create calendar grid
  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  
  // Adjust first day calculation for Monday-based week
  let firstDayOfWeek = firstDay.getDay() || 7;
  
  // Add empty cells before first day
  for (let i = 1; i < firstDayOfWeek; i++) {
    const cell = document.createElement('div');
    cell.className = 'habits-calendar-cell';
    calendarGrid.appendChild(cell);
  }
  
  // Add cells for each day
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(currentYear, currentMonth, day);
    const dateKey = this.getDateKey(date);
    const status = habit.history[dateKey];
    
    const cell = document.createElement('div');
    cell.className = 'habits-calendar-cell';
    cell.dataset.dateKey = dateKey; // Store the dateKey for easier access
    
    if (status === 'done') {
      cell.className += ` active ${habit.color}`;
    }
    
    // Check if this date is in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to midnight for accurate comparison
    const isFutureDate = date > today;

    // Highlight today
    if (day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()) {
      cell.style.border = '2px solid #2196F3';
    }
    
    // Add future-date class for dates in the future
    if (isFutureDate) {
      cell.classList.add('future-date');
    }
    
    cell.textContent = day;
    
    // Make cells clickable in edit mode, but only if not a future date
    if (this.isCalendarEditing && !isFutureDate) {
      cell.classList.add('editable');
    }
    
    calendarGrid.appendChild(cell);
  }
  
  monthContainer.appendChild(calendarGrid);
  return monthContainer;
}

/**
 * Add new method to load more past months (older history)
 */
loadMorePastMonths(habit) {
  // Get the oldest month currently displayed
  const oldestMonth = this.months[this.months.length - 1];
  if (!oldestMonth) return;
  
  const oldestDate = new Date(oldestMonth.year, oldestMonth.month, 1);
  const newMonths = [];
  
  // Add 12 more months further back in time
  for (let i = 1; i <= 12; i++) {
    const newDate = new Date(oldestDate);
    newDate.setMonth(oldestDate.getMonth() - i);
    
    newMonths.push({
      year: newDate.getFullYear(),
      month: newDate.getMonth(),
    });
  }
  
  // Add to months array
  this.months = [...this.months, ...newMonths];
  
  // Find and remove the load more button
  const oldLoadMoreButton = this.calendarScrollContent.querySelector('.habits-load-more-container');
  if (oldLoadMoreButton) {
    this.calendarScrollContent.removeChild(oldLoadMoreButton);
  }
  
  // Create and append new month elements
  newMonths.forEach(({ year, month }) => {
    const monthDate = new Date(year, month, 1);
    const monthContainer = this.createMonthCalendar(habit, monthDate);
    this.calendarScrollContent.appendChild(monthContainer);
  });
  
  // Add the load more button back after new months
  const loadMoreContainer = document.createElement('div');
  loadMoreContainer.className = 'habits-load-more-container';
  
  const loadMoreButton = document.createElement('button');
  loadMoreButton.className = 'habits-load-more-button';
  loadMoreButton.textContent = 'Load More History';
  loadMoreButton.addEventListener('click', () => this.loadMorePastMonths(habit));
  
  loadMoreContainer.appendChild(loadMoreButton);
  this.calendarScrollContent.appendChild(loadMoreContainer);
  
  // Show success message
  utils.showToast('Loaded 12 more months of history', 'success');
}

/**
 * Setup infinite scroll for calendar
 * @param {Object} habit - Habit object
 */
setupInfiniteScroll(habit) {
  // Remove existing scroll listener
  if (this.calendarScrollContent.onscroll) {
    this.calendarScrollContent.removeEventListener('scroll', this.calendarScrollContent.onscroll);
  }
  
  // Add new scroll listener
  this.calendarScrollContent.onscroll = () => {
    if (this.calendarScrollContent.scrollLeft > 
        this.calendarScrollContent.scrollWidth - this.calendarScrollContent.clientWidth - 100) {
      this.loadMoreFutureMonths(habit);
    }
  };
}

/**
 * Load more future months for calendar
 * @param {Object} habit - Habit object
 */
loadMoreFutureMonths(habit) {
  // Get the last month currently displayed
  const lastMonth = this.months[this.months.length - 1];
  if (!lastMonth) return;
  
  const lastDate = new Date(lastMonth.year, lastMonth.month, 1);
  const newMonths = [];
  
  // Add 6 more months
  for (let i = 1; i <= 6; i++) {
    const newDate = new Date(lastDate);
    newDate.setMonth(lastDate.getMonth() + i);
    
    newMonths.push({
      year: newDate.getFullYear(),
      month: newDate.getMonth(),
    });
  }
  
  // Add to months array
  this.months = [...this.months, ...newMonths];
  
  // Create and append new month elements
  newMonths.forEach(({ year, month }) => {
    const monthDate = new Date(year, month, 1);
    const monthContainer = this.createMonthCalendar(habit, monthDate);
    this.calendarScrollContent.appendChild(monthContainer);
  });
}

/**
 * Toggle calendar edit mode - FIXED
 */
toggleCalendarEdit() {
  this.isCalendarEditing = !this.isCalendarEditing;
  const editButton = document.getElementById('habits-edit-calendar-button');
  
  if (this.isCalendarEditing) {
    editButton.classList.add('active');
  } else {
    editButton.classList.remove('active');
  }
  
  // Update the editable state of existing calendar cells
  const calendarCells = document.querySelectorAll('.habits-calendar-cell:not(.day-label)');
  
  calendarCells.forEach(cell => {
    // Skip empty cells
    if (!cell.textContent.trim()) return;
    
    // Check if this date is in the future
    const dateKey = cell.dataset.dateKey;
    if (!dateKey) return;
    
    const cellDate = new Date(dateKey);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time for accurate comparison
    const isFutureDate = cellDate > today;
    
    if (this.isCalendarEditing && !isFutureDate) {
      cell.classList.add('editable');
      
      // Get the current habit
      const habit = this.habits[this.currentHabitIndex];
      
      // Add direct click handler to toggle status
      cell.addEventListener('click', (e) => {
        const currentStatus = habit.history[dateKey] || 'fail';
        habit.history[dateKey] = currentStatus === 'fail' ? 'done' : 'fail';
        
        // Update the cell appearance directly instead of re-rendering
        if (habit.history[dateKey] === 'done') {
          cell.classList.add('active', habit.color);
        } else {
          cell.classList.remove('active', habit.color);
        }
        
        this.saveHabits();
        
        // Update chart and streaks without re-rendering calendar
        this.renderChart(habit);
        this.renderStreaks(habit);
        
        // Prevent event bubbling
        e.stopPropagation();
      });
    } else {
      cell.classList.remove('editable');
      
      // Remove click event listeners by cloning and replacing
      const newCell = cell.cloneNode(true);
      cell.parentNode.replaceChild(newCell, cell);
    }
  });
}

/**
 * Render streaks for habit
 * @param {Object} habit - Habit object
 */
renderStreaks(habit) {
  if (!this.habitStreaks) return;
  
  this.habitStreaks.innerHTML = '';
  
  // Calculate streaks
  const streaks = this.calculateStreaks(habit.history);
  
  // Show top 3 streaks
  const topStreaks = streaks.slice(0, 3);
  
  if (topStreaks.length === 0) {
    const noStreaks = document.createElement('p');
    noStreaks.textContent = 'No streaks recorded yet.';
    this.habitStreaks.appendChild(noStreaks);
    return;
  }
  
  // Create streak bars
  topStreaks.forEach(streak => {
    const streakBar = document.createElement('div');
    streakBar.className = 'habits-streak-bar';
    
    const startDate = new Date(streak.start);
    const endDate = new Date(streak.end);
    
    const dateRange = document.createElement('div');
    dateRange.className = 'habits-streak-date';
    dateRange.textContent = `${startDate.getMonth() + 1}/${startDate.getDate()} - ${endDate.getMonth() + 1}/${endDate.getDate()}`;
    
    const streakVisual = document.createElement('div');
    streakVisual.className = `habits-streak-visual ${habit.color}`;
    
    // For light colors, use dark text
    if (['yellow', 'lightpink', 'lightgreen', 'lightblue', 'default'].includes(habit.color)) {
      streakVisual.classList.add('text-dark');
    }
    
    streakVisual.textContent = `${streak.length} days`;
    
    streakBar.appendChild(dateRange);
    streakBar.appendChild(streakVisual);
    
    this.habitStreaks.appendChild(streakBar);
  });
}

/**
 * Calculate streaks from habit history
 * @param {Object} history - Habit history
 * @returns {Array} - Array of streak objects
 */
calculateStreaks(history) {
  const sortedDates = Object.entries(history)
    .filter(([date, status]) => status === 'done')
    .map(([date]) => date)
    .sort();
  
  const streaks = [];
  let currentStreak = null;
  
  sortedDates.forEach(date => {
    const currentDate = new Date(date);
    
    if (!currentStreak) {
      currentStreak = { start: date, end: date, length: 1 };
    } else {
      const lastDate = new Date(currentStreak.end);
      const nextDay = new Date(lastDate);
      nextDay.setDate(lastDate.getDate() + 1);
      
      if (currentDate.getTime() === nextDay.getTime()) {
        currentStreak.end = date;
        currentStreak.length++;
      } else {
        streaks.push(currentStreak);
        currentStreak = { start: date, end: date, length: 1 };
      }
    }
  });
  
  if (currentStreak) {
    streaks.push(currentStreak);
  }
  
  return streaks.sort((a, b) => b.length - a.length);
}

/**
 * Check if daily habits need to be reset
 */
checkAndResetDailyHabits() {
  const currentDate = utils.formatDate(new Date());
  const lastResetDate = localStorage.getItem(this.lastResetKey);
  
  if (lastResetDate !== currentDate) {
    // Nothing to reset, just update the last reset date
    localStorage.setItem(this.lastResetKey, currentDate);
  }
}

/**
 * Setup automatic reset at midnight
 */
setupMidnightReset() {
  // Calculate time until next midnight
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const midnight = new Date(tomorrow.setHours(0, 0, 0, 0));
  const msUntilMidnight = midnight - now;
  
  // Set timeout for midnight reset
  setTimeout(() => {
    this.checkAndResetDailyHabits();
    this.setupMidnightReset(); // Set up next day's reset
  }, msUntilMidnight);
}
}