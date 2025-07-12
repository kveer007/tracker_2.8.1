/**
 * Health Tracker App - Workout Tracker
 * This file contains the implementation of the workout tracker functionality
 */

/**
 * WorkoutTracker class for tracking workout exercises
 */
class WorkoutTracker {
    /**
     * Create a new workout tracker
     */
    constructor() {
        // Define storage keys
        this.stateKey = 'workout_state';
        this.historyKey = 'workout_history';
        this.countKey = 'workout_count';
        this.lastResetKey = `${STORAGE_KEYS.LAST_RESET_PREFIX}workout`;
        
        // Define workout types - Added "Shoulders" to the list
        this.workoutTypes = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Abs', 'Legs'];
        
        // Load data from localStorage
        this.workoutState = JSON.parse(localStorage.getItem(this.stateKey)) || 
          this.workoutTypes.reduce((acc, type) => {
            acc[type] = { completed: false, order: this.workoutTypes.indexOf(type) };
            return acc;
          }, {});
        
        this.workoutCounts = JSON.parse(localStorage.getItem(this.countKey)) || 
          this.workoutTypes.reduce((acc, type) => {
            acc[type] = 0;
            return acc;
          }, {});
      
        this.workoutHistory = JSON.parse(localStorage.getItem(this.historyKey)) || {};
        
        // Set DOM elements
        this.elements = {
            tabsContainer: document.getElementById('workout-tabs-container'),
            historyPanel: document.getElementById('workout-history-popup'),
            dailyHistoryTab: document.getElementById('workout-daily-history'),
            currentWorkoutsTab: document.getElementById('workout-current-exercises'),
            // New Analytics elements
            analyticsTab: document.getElementById('workout-analytics'),
            workoutChart: document.getElementById('workout-chart'),
            chartLabels: document.getElementById('workout-chart-labels'),
            workoutStreaks: document.getElementById('workout-streaks'),
            viewTypeSelect: document.getElementById('workout-view-type'),
            timePeriodSelect: document.getElementById('workout-time-period')
        };
        
        // Default analytics settings
        this.selectedWorkoutView = 'all';
        this.selectedTimePeriod = 'weekly';
        
        // Initialize tracker
        this.initializeTracker();
    }
    
    /**
     * Initialize tracker
     */
    initializeTracker() {
        // Check for daily reset
        this.checkAndResetDailyWorkouts();
        
        // Set up auto-reset at midnight
        this.setupMidnightReset();
        
        // Render workout tabs
        this.renderWorkoutTabs();
        
        // Update display
        this.updateDisplay();
        
        // Initialize workout analytics
        this.initializeWorkoutAnalytics();
    }
    
    /**
     * Render workout tabs in the container
     */
    renderWorkoutTabs() {
        if (!this.elements.tabsContainer) return;
        
        this.elements.tabsContainer.innerHTML = '';
        
        // Sort workout types by completed status and then by order
        const sortedWorkouts = Object.entries(this.workoutState)
        .sort(([, a], [, b]) => {
            // Completed workouts go to the bottom
            if (a.completed !== b.completed) {
                return a.completed ? 1 : -1;
            }
            // Otherwise, maintain original order
            return a.order - b.order;
        })
        .map(([type]) => type);
        
        // Create tabs for each workout type
        sortedWorkouts.forEach(type => {
            const tab = document.createElement('button');
            tab.className = `workout-tab ${this.workoutState[type].completed ? 'completed' : ''}`;
            tab.dataset.type = type;
            
            const icon = document.createElement('i');
            icon.className = 'material-icons-round';
            icon.textContent = this.workoutState[type].completed ? 'check_circle' : 'radio_button_unchecked';
            
            const text = document.createElement('span');
            text.textContent = type;
            
            // Add count badge if clicked more than once
            if (this.workoutCounts[type] > 1) {
                const badge = document.createElement('span');
                badge.className = 'count-badge';
                badge.textContent = this.workoutCounts[type];
                tab.appendChild(badge);
            }
            
            tab.appendChild(icon);
            tab.appendChild(text);
            
            // Add click event
            tab.addEventListener('click', () => this.toggleWorkout(type));
            
            this.elements.tabsContainer.appendChild(tab);
        });
    }
    
    /**
     * Toggle workout completion status
     * @param {string} type - Workout type
     */
    toggleWorkout(type) {
        // Increase count
        this.workoutCounts[type] += 1;
        
        // Update completion status
        this.workoutState[type].completed = true;
        
        // Record in history
        this.saveWorkoutHistory(type);
        
        // Check if all workouts are completed
        const allCompleted = Object.values(this.workoutState).every(state => state.completed);
        if (allCompleted) {
            this.resetWorkoutTabs();
            utils.showToast('All workouts completed! Tabs have been reset.', 'success');
        } else {
            // Save state and update display
            this.saveState();
            this.renderWorkoutTabs();
            this.refreshHistory();
            
            utils.showToast(`${type} workout marked as complete!`, 'success');
        }
    }
    
    /**
     * Save the current state to localStorage
     */
    saveState() {
        localStorage.setItem(this.stateKey, JSON.stringify(this.workoutState));
        localStorage.setItem(this.countKey, JSON.stringify(this.workoutCounts));
    }
    
    /**
     * Reset workout tabs (but keep history)
     */
    resetWorkoutTabs() {
        // Reset workout state
        this.workoutTypes.forEach(type => {
            this.workoutState[type].completed = false;
            this.workoutState[type].order = this.workoutTypes.indexOf(type);
        });
        
        // Reset workout counts
        this.workoutTypes.forEach(type => {
            this.workoutCounts[type] = 0;
        });
        
        // Save and update display
        this.saveState();
        this.renderWorkoutTabs();
        this.refreshHistory();
    }
    
    /**
     * Save workout to daily history
     * @param {string} type - Workout type
     */
    saveWorkoutHistory(type) {
        const currentDate = utils.formatDate(new Date());
        
        if (!this.workoutHistory[currentDate]) {
            this.workoutHistory[currentDate] = [];
        }
        
        this.workoutHistory[currentDate].push({
            type,
            count: this.workoutCounts[type],
            timestamp: new Date().toISOString()
        });
        
        localStorage.setItem(this.historyKey, JSON.stringify(this.workoutHistory));
    }
    
    /**
     * Refresh history displays
     */
    refreshHistory() {
        this.showDailyHistory();
        this.showCurrentWorkouts();
        this.renderWorkoutAnalytics(); // Add analytics rendering
    }
    
    /**
     * Show daily history (weekly summary)
     */
    showDailyHistory() {
        if (!this.elements.dailyHistoryTab) return;
        
        this.elements.dailyHistoryTab.innerHTML = '';
        const fragment = document.createDocumentFragment();
        
        // Sort dates (most recent first) and limit to 7 days
        const dates = Object.keys(this.workoutHistory).sort((a, b) => {
            return b.localeCompare(a);
        }).slice(0, 7);
        
        if (dates.length === 0) {
            const noData = document.createElement('p');
            noData.textContent = 'No workout history available.';
            fragment.appendChild(noData);
        } else {
            dates.forEach(date => {
                const entries = this.workoutHistory[date];
                
                const dayEntry = document.createElement('div');
                dayEntry.className = 'day-entry';
                
                const dateText = document.createElement('p');
                dateText.innerHTML = `<b>${date}</b>`;
                dayEntry.appendChild(dateText);
                
                // Group workouts by type
                const workoutsByType = {};
                entries.forEach(entry => {
                    if (!workoutsByType[entry.type]) {
                        workoutsByType[entry.type] = 0;
                    }
                    workoutsByType[entry.type] += 1;
                });
                
                // Show workout summary
                const workoutSummary = document.createElement('p');
                workoutSummary.textContent = `Completed workouts: ${Object.keys(workoutsByType).length} types`;
                dayEntry.appendChild(workoutSummary);
                
                // List each workout type
                const workoutList = document.createElement('ul');
                workoutList.style.paddingLeft = '20px';
                workoutList.style.marginTop = '5px';
                
                Object.entries(workoutsByType).forEach(([type, count]) => {
                    const workoutItem = document.createElement('li');
                    workoutItem.textContent = `${type}: ${count} ${count === 1 ? 'time' : 'times'}`;
                    workoutList.appendChild(workoutItem);
                });
                
                dayEntry.appendChild(workoutList);
                fragment.appendChild(dayEntry);
            });
        }
        
        this.elements.dailyHistoryTab.appendChild(fragment);
        this.elements.dailyHistoryTab.classList.add('active');
        
        if (this.elements.currentWorkoutsTab) {
            this.elements.currentWorkoutsTab.classList.remove('active');
        }
    }
    
    /**
     * Show current day's workouts
     */
    showCurrentWorkouts() {
        if (!this.elements.currentWorkoutsTab) return;
        
        this.elements.currentWorkoutsTab.innerHTML = '';
        const currentDate = utils.formatDate(new Date());
        const entries = this.workoutHistory[currentDate] || [];
        
        const container = document.createElement('div');
        
        const header = document.createElement('h3');
        header.textContent = `Today's Workouts`;
        container.appendChild(header);
        
        if (entries.length === 0) {
            const noEntries = document.createElement('p');
            noEntries.textContent = 'No workouts recorded today.';
            container.appendChild(noEntries);
        } else {
            // Group entries by workout type and count
            const groupedEntries = {};
            entries.forEach(entry => {
                if (!groupedEntries[entry.type]) {
                    groupedEntries[entry.type] = [];
                }
                groupedEntries[entry.type].push(entry);
            });
            
            const entriesList = document.createElement('ul');
            
            Object.entries(groupedEntries).forEach(([type, typeEntries]) => {
                const entryItem = document.createElement('li');
                const lastEntry = typeEntries[typeEntries.length - 1];
                const time = new Date(lastEntry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                entryItem.innerHTML = `<b>${type}</b>: ${typeEntries.length} ${typeEntries.length === 1 ? 'time' : 'times'} (last at ${time})`;
                entriesList.appendChild(entryItem);
            });
            
            container.appendChild(entriesList);
        }
        
        this.elements.currentWorkoutsTab.appendChild(container);
    }
    
    /**
     * Check if daily workouts need to be reset
     */
    checkAndResetDailyWorkouts() {
    const currentDate = utils.formatDate(new Date());
    const lastResetDate = localStorage.getItem(this.lastResetKey);
    
    // Only record the date check, but don't reset unless all workouts are completed
    if (lastResetDate !== currentDate) {
        // Just update the last reset date without resetting workouts
        localStorage.setItem(this.lastResetKey, currentDate);
        
        this.preserveTodaysWorkoutData();
    }
     }
    
    /**
     * Helper function to preserve workout data across days
     */
    preserveTodaysWorkoutData() {
        // Instead of removing today's history, we'll keep what we have
        // and just update the internal tracking date
        const currentDate = utils.formatDate(new Date());
        
        // Make sure current date's data structure exists
        if (!this.workoutHistory[currentDate]) {
            this.workoutHistory[currentDate] = [];
            localStorage.setItem(this.historyKey, JSON.stringify(this.workoutHistory));
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
            this.checkAndResetDailyWorkouts();
            this.setupMidnightReset(); // Set up next day's reset
        }, msUntilMidnight);
    }
    
    /**
     * Reset daily workouts and remove today's history
     */
    resetDailyWorkouts() {
        // Reset workout tabs
        this.resetWorkoutTabs();
        
        // Remove today's history
        const currentDate = utils.formatDate(new Date());
        if (this.workoutHistory[currentDate]) {
            delete this.workoutHistory[currentDate];
            localStorage.setItem(this.historyKey, JSON.stringify(this.workoutHistory));
        }
    }
    
    /**
     * Reset all data for this tracker
     */
    resetAllData() {
        localStorage.removeItem(this.stateKey);
        localStorage.removeItem(this.countKey);
        localStorage.removeItem(this.historyKey);
        localStorage.removeItem(this.lastResetKey);
        
        utils.showToast('All workout tracking data has been reset.', 'warning');
        
        // Reload the page to reset all instances
        setTimeout(() => location.reload(), 1500);
    }
    
    /**
     * Update display
     */
    updateDisplay() {
        this.renderWorkoutTabs();
        this.refreshHistory();
    }

    /**
     * Initialize workout analytics
     */
    initializeWorkoutAnalytics() {
        // Populate workout type options in dropdown
        if (this.elements.viewTypeSelect) {
            // Clear any existing options after the first two (All and Comparison)
            while (this.elements.viewTypeSelect.options.length > 2) {
                this.elements.viewTypeSelect.remove(2);
            }
            
            // Add individual workout options
            this.workoutTypes.forEach(type => {
                const option = document.createElement('option');
                option.value = type.toLowerCase();
                option.textContent = type;
                this.elements.viewTypeSelect.appendChild(option);
            });
            
            // Add event listener for dropdown change
            this.elements.viewTypeSelect.addEventListener('change', (e) => {
                this.selectedWorkoutView = e.target.value;
                this.renderWorkoutAnalytics();
            });
        }
        
        // Add event listener for time period dropdown
        if (this.elements.timePeriodSelect) {
            this.elements.timePeriodSelect.addEventListener('change', (e) => {
                this.selectedTimePeriod = e.target.value;
                this.renderWorkoutAnalytics();
            });
        }
        
        // Initialize view
        this.renderWorkoutAnalytics();
    }
    
    /**
     * Render workout analytics (graph and streaks)
     */
    renderWorkoutAnalytics() {
        this.renderWorkoutGraph();
        this.renderWorkoutStreaks();
    }

    /**
     * Calculate consistency score for workouts
     * @param {Object} history - Workout history with dates as keys
     * @param {Date} endDate - End date for calculation
     * @param {number} days - Number of days to look back
     * @param {string|null} specificType - Specific workout type to calculate score for
     * @returns {number} - Consistency score (0-100)
     */
    calculateConsistencyScore(history, endDate, days = 30, specificType = null) {
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
            const dateKey = utils.formatDate(date);
            
            // Weight factor decreases as we go further back in time
            const dayWeight = (days - i) / days * (i < 7 ? recentWeight : 1);
            
            // Check if any workout was done on this day
            const entries = history[dateKey] || [];
            
            // If filtering by type, check if that specific workout was done
            const isDone = specificType 
                ? entries.some(entry => entry.type === specificType)
                : entries.length > 0;
            
            if (isDone) {
                // Add points for completed day
                score += basePoints * dayWeight;
                
                // For workouts, give extra points for multiple workout types in a day
                if (!specificType && entries.length > 1) {
                    const uniqueTypes = new Set(entries.map(entry => entry.type)).size;
                    score += Math.min(uniqueTypes * 5, 30) * dayWeight;
                }
                
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
     * @returns {Array|Object} - Data points or object of data points by type
     */
    getConsistencyDataByTimePeriod() {
        const today = new Date();
        let dataPoints = [];
        
        // Handle different views (all, comparison, specific workout)
        if (this.selectedWorkoutView === 'all') {
            // Overall workout consistency
            switch (this.selectedTimePeriod) {
                case 'weekly':
                    // Last 7 days
                    for (let i = 6; i >= 0; i--) {
                        const date = new Date(today);
                        date.setDate(today.getDate() - i);
                        
                        // Calculate score for overall workouts
                        const score = this.calculateConsistencyScore(this.workoutHistory, date, 7);
                        
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
                        date.setDate(today.getDate() - (4 - i) * 7);
                        
                        const score = this.calculateConsistencyScore(this.workoutHistory, date, 7);
                        
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
                        
                        const score = this.calculateConsistencyScore(this.workoutHistory, date, 14);
                        
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
                        
                        const score = this.calculateConsistencyScore(this.workoutHistory, date, 30);
                        
                        dataPoints.push({
                            date: date,
                            value: score
                        });
                    }
                    break;
            }
        } else if (this.selectedWorkoutView === 'comparison') {
            // Comparison view - scores for each workout type
            dataPoints = {};
            
            this.workoutTypes.forEach(type => {
                dataPoints[type] = [];
                
                switch (this.selectedTimePeriod) {
                    case 'weekly':
                        // Last 7 days
                        for (let i = 6; i >= 0; i--) {
                            const date = new Date(today);
                            date.setDate(today.getDate() - i);
                            
                            const score = this.calculateConsistencyScore(
                                this.workoutHistory, date, 7, type
                            );
                            
                            dataPoints[type].push({
                                date: date,
                                value: score
                            });
                        }
                        break;
                        
                    case 'monthly':
                        // Last 4 weeks
                        for (let i = 0; i < 4; i++) {
                            const date = new Date(today);
                            date.setDate(today.getDate() - (3 - i) * 7);
                            
                            const score = this.calculateConsistencyScore(
                                this.workoutHistory, date, 7, type
                            );
                            
                            dataPoints[type].push({
                                date: date,
                                value: score
                            });
                        }
                        break;
                        
                    case 'quarterly':
                        // Last 3 months (12 weeks)
                        for (let i = 0; i < 6; i++) {
                            const date = new Date(today);
                            date.setDate(today.getDate() - (5 - i) * 14);
                            
                            const score = this.calculateConsistencyScore(
                                this.workoutHistory, date, 14, type
                            );
                            
                            dataPoints[type].push({
                                date: date,
                                value: score
                            });
                        }
                        break;
                        
                    case 'yearly':
                        // Last 12 months
                        for (let i = 0; i < 6; i++) {
                            const date = new Date(today);
                            date.setMonth(today.getMonth() - (5 - i) * 2);
                            
                            const score = this.calculateConsistencyScore(
                                this.workoutHistory, date, 30, type
                            );
                            
                            dataPoints[type].push({
                                date: date,
                                value: score
                            });
                        }
                        break;
                }
            });
        } else {
            // Individual workout type view
            const selectedType = this.selectedWorkoutView.charAt(0).toUpperCase() + 
                               this.selectedWorkoutView.slice(1);
            
            switch (this.selectedTimePeriod) {
                case 'weekly':
                    // Last 7 days
                    for (let i = 6; i >= 0; i--) {
                        const date = new Date(today);
                        date.setDate(today.getDate() - i);
                        
                        const score = this.calculateConsistencyScore(
                            this.workoutHistory, date, 7, selectedType
                        );
                        
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
                        date.setDate(today.getDate() - (4 - i) * 7);
                        
                        const score = this.calculateConsistencyScore(
                            this.workoutHistory, date, 7, selectedType
                        );
                        
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
                        
                        const score = this.calculateConsistencyScore(
                            this.workoutHistory, date, 14, selectedType
                        );
                        
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
                        
                        const score = this.calculateConsistencyScore(
                            this.workoutHistory, date, 30, selectedType
                        );
                        
                        dataPoints.push({
                            date: date,
                            value: score
                        });
                    }
                    break;
            }
        }
        
        return dataPoints;
    }

    /**
     * Render workout graph
     */
    renderWorkoutGraph() {
        const chartContainer = this.elements.workoutChart;
        if (!chartContainer) return;
        
        // Clear existing content except labels
        const yLabels = chartContainer.querySelector('.workout-chart-y-labels');
        const axis = chartContainer.querySelector('.workout-chart-axis');
        chartContainer.innerHTML = '';
        if (yLabels) chartContainer.appendChild(yLabels);
        if (axis) chartContainer.appendChild(axis);
        
        // Get consistency data
        const dataPoints = this.getConsistencyDataByTimePeriod();
        
        // Check if chart container is visible
        if (chartContainer.offsetWidth === 0) {
            setTimeout(() => this.renderWorkoutGraph(), 100);
            return;
        }
        
        // Render based on view type
        if (this.selectedWorkoutView === 'all' || 
            this.selectedWorkoutView !== 'comparison') {
            // Single line chart
            this.renderSingleLineChart(dataPoints, chartContainer);
        } else {
            // Multiple line chart for comparison
            this.renderMultiLineChart(dataPoints, chartContainer);
        }
        
        // Render labels
        this.renderChartLabels();
    }
    
    /**
     * Render single line chart using consistency scores
     * @param {Array} dataPoints - Consistency data points
     * @param {Element} container - Chart container
     */
    renderSingleLineChart(dataPoints, container) {
        // We're using consistency scores (0-100) so max value is fixed
        const maxValue = 100;
        
        // Update y-axis labels with fixed 0-100 scale
        this.updateYAxisLabels(maxValue);
        
        // Calculate coordinates for smooth curve
        const pathPoints = this.calculateSmoothCurve(dataPoints, container, maxValue);
        
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
        path.setAttribute("stroke", this.getWorkoutColor());
        path.setAttribute("stroke-width", "2");
        path.setAttribute("stroke-linecap", "round");
        path.setAttribute("stroke-linejoin", "round");
        svg.appendChild(path);
        container.appendChild(svg);
        
        // Render data points
        dataPoints.forEach((point, index) => {
            const x = 40 + (index / (dataPoints.length - 1)) * (container.offsetWidth - 50);
            const y = container.offsetHeight - (point.value / maxValue) * (container.offsetHeight - 20);
            
            const pointElement = document.createElement('div');
            pointElement.className = `workout-chart-point`;
            pointElement.style.left = `${x}px`;
            pointElement.style.top = `${y}px`;
            
            // Add tooltip with the actual score value
            pointElement.setAttribute('title', `Score: ${point.value}`);
            
            container.appendChild(pointElement);
        });
    }
    
    /**
     * Render multi line chart for comparison with consistency scores
     * @param {Object} dataPoints - Data points keyed by workout type
     * @param {Element} container - Chart container
     */
    renderMultiLineChart(dataPoints, container) {
        // We're using consistency scores (0-100) so max value is fixed
        const maxValue = 100;
        
        // Update y-axis labels with fixed scale
        this.updateYAxisLabels(maxValue);
        
        // Create SVG for all lines
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("width", "100%");
        svg.setAttribute("height", "100%");
        svg.style.position = "absolute";
        svg.style.top = "0";
        svg.style.left = "0";
        
        // Create legend
        const legend = document.createElement('div');
        legend.className = 'workout-chart-legend';
        
        // Process each workout type
        Object.entries(dataPoints).forEach(([type, typeData], typeIndex) => {
            // Get color for this workout
            const color = this.getWorkoutColor(type, typeIndex);
            
            // Calculate path
            const pathPoints = this.calculateSmoothCurve(typeData, container, maxValue);
            
            // Create path element
            const path = document.createElementNS(svgNS, "path");
            path.setAttribute("d", pathPoints);
            path.setAttribute("fill", "none");
            path.setAttribute("stroke", color);
            path.setAttribute("stroke-width", "2");
            path.setAttribute("stroke-linecap", "round");
            path.setAttribute("stroke-linejoin", "round");
            svg.appendChild(path);
            
            // Add legend item
            const legendItem = document.createElement('div');
            legendItem.className = 'workout-legend-item';
            
            const colorSwatch = document.createElement('span');
            colorSwatch.className = 'workout-color-swatch';
            colorSwatch.style.backgroundColor = color;
            
            const typeName = document.createElement('span');
            typeName.textContent = type;
            
            legendItem.appendChild(colorSwatch);
            legendItem.appendChild(typeName);
            legend.appendChild(legendItem);
            
            // Render data points for this type
            typeData.forEach((point, index) => {
                const x = 40 + (index / (typeData.length - 1)) * (container.offsetWidth - 50);
                const y = container.offsetHeight - (point.value / maxValue) * (container.offsetHeight - 20);
                
                const pointElement = document.createElement('div');
                pointElement.className = `workout-chart-point`;
                pointElement.style.backgroundColor = color;
                pointElement.style.left = `${x}px`;
                pointElement.style.top = `${y}px`;
                
                // Add tooltip with the actual score value
                pointElement.setAttribute('title', `${type} Score: ${point.value}`);
                
                container.appendChild(pointElement);
            });
        });
        
        // Add svg and legend to container
        container.appendChild(svg);
        container.appendChild(legend);
    }
    
    /**
     * Update Y-axis labels based on data maximum
     * @param {number} maxValue - Maximum value (100 for consistency score)
     */
    updateYAxisLabels(maxValue) {
        const yLabelsContainer = this.elements.workoutChart.querySelector('.workout-chart-y-labels');
        if (!yLabelsContainer) return;
        
        // Clear existing labels
        yLabelsContainer.innerHTML = '';
        
        // Create labels with evenly distributed values (0, 25, 50, 75, 100)
        const steps = 5;
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
     */
    renderChartLabels() {
        if (!this.elements.chartLabels) return;
        
        this.elements.chartLabels.innerHTML = '';
        
        // Get dates based on time period
        const today = new Date();
        let labelDates = [];
        
        switch (this.selectedTimePeriod) {
            case 'weekly':
                // Last 7 days
                for (let i = 6; i >= 0; i--) {
                    const date = new Date(today);
                    date.setDate(today.getDate() - i);
                    labelDates.push(date);
                }
                break;
                
            case 'monthly':
                // Last 30 days, but show only key dates
                for (let i = 0; i < 30; i += 5) {
                    const date = new Date(today);
                    date.setDate(today.getDate() - 29 + i);
                    labelDates.push(date);
                }
                // Always include today
                labelDates.push(today);
                break;
                
            case 'quarterly':
                // Last 90 days, but show only key dates
                for (let i = 0; i < 90; i += 15) {
                    const date = new Date(today);
                    date.setDate(today.getDate() - 89 + i);
                    labelDates.push(date);
                }
                // Include today
                labelDates.push(today);
                break;
                
            case 'yearly':
                // Last 12 months, show monthly labels
                for (let i = 11; i >= 0; i--) {
                    const date = new Date(today);
                    date.setMonth(today.getMonth() - i);
                    date.setDate(1); // First day of month
                    labelDates.push(date);
                }
                break;
        }
        
        // Determine how many labels to show (reduce for smaller screens)
        const maxLabels = window.innerWidth < 400 ? 3 : 5;
        const step = Math.ceil(labelDates.length / maxLabels);
        
        // Add labels with proper spacing
        labelDates.forEach((date, index) => {
            // Only show beginning, end, and some intermediate labels
            if (index === 0 || index === labelDates.length - 1 || index % step === 0) {
                const label = document.createElement('span');
                label.textContent = this.formatDateForTimePeriod(date);
                this.elements.chartLabels.appendChild(label);
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
                const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()];
                return monthShort + ' ' + date.getDate();
                
            case 'quarterly':
                const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()];
                return month + ' ' + date.getDate();
                
            case 'yearly':
                // For yearly view, just show the month name
                const monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()];
                return monthName + ' ' + date.getFullYear().toString().substr(2, 2); // Show "Jan 23" format
                
            default:
                return (date.getMonth() + 1) + '/' + date.getDate();
        }
    }
    
    /**
     * Get color for workout
     * @param {string} type - Workout type (optional)
     * @param {number} index - Index for color selection (optional)
     * @returns {string} - Color hex code
     */
    getWorkoutColor(type, index) {
        // Predefined color palette for different workout types
        const colors = [
            '#FF5042', // coral (chest)
            '#5B6EF7', // royalblue (back)
            '#B96CDA', // purple (shoulders)
            '#58B5F0', // skyblue (biceps)
            '#4AD6B8', // seagreen (triceps)
            '#FF7B29', // tangerine (abs)
            '#4CAF50'  // green (legs)
        ];
        
        // If specific workout type is provided
        if (type) {
            const typeIndex = this.workoutTypes.indexOf(type);
            if (typeIndex >= 0) {
                return colors[typeIndex % colors.length];
            }
            return colors[index % colors.length];
        }
        
        // Default workout color (if no type provided)
        return '#4CAF50'; // workout primary color
    }
    
    /**
     * Calculate and render workout streaks
     */
    renderWorkoutStreaks() {
        if (!this.elements.workoutStreaks) return;
        
        this.elements.workoutStreaks.innerHTML = '';
        
        // Calculate streaks based on consistency
        const streaks = this.calculateWorkoutStreaks();
        
        // Show top 3 streaks
        const topStreaks = streaks.slice(0, 3);
        
        if (topStreaks.length === 0) {
            const noStreaks = document.createElement('p');
            noStreaks.textContent = 'No streaks recorded yet.';
            this.elements.workoutStreaks.appendChild(noStreaks);
            return;
        }
        
        // Create streak bars
        topStreaks.forEach(streak => {
            const streakBar = document.createElement('div');
            streakBar.className = 'workout-streak-bar';
            
            const startDate = new Date(streak.start);
            const endDate = new Date(streak.end);
            
            const dateRange = document.createElement('div');
            dateRange.className = 'workout-streak-date';
            dateRange.textContent = `${startDate.getMonth() + 1}/${startDate.getDate()} - ${endDate.getMonth() + 1}/${endDate.getDate()}`;
            
            const streakVisual = document.createElement('div');
            streakVisual.className = `workout-streak-visual`;
            
            // Set color based on workout type if available
            if (streak.type) {
                const typeIndex = this.workoutTypes.indexOf(streak.type);
                streakVisual.style.backgroundColor = this.getWorkoutColor(streak.type, typeIndex);
                
                // Add type name for comparison view
                if (this.selectedWorkoutView === 'comparison') {
                    streakVisual.textContent = `${streak.type}: ${streak.length} days`;
                } else {
                    streakVisual.textContent = `${streak.length} days`;
                }
            } else {
                streakVisual.textContent = `${streak.length} days`;
            }
            
            streakBar.appendChild(dateRange);
            streakBar.appendChild(streakVisual);
            
            this.elements.workoutStreaks.appendChild(streakBar);
        });
    }
    
    /**
     * Calculate workout streaks based on consistency
     * @returns {Array} Array of streak objects
     */
    calculateWorkoutStreaks() {
        // Get all workout dates in ascending order
        const sortedDates = Object.keys(this.workoutHistory).sort();
        const streaks = [];
        
        if (this.selectedWorkoutView === 'all') {
            // Calculate streaks for any workout
            let currentStreak = null;
            
            sortedDates.forEach(date => {
                const entries = this.workoutHistory[date];
                if (!entries || entries.length === 0) {
                    // No workouts on this day, end streak
                    if (currentStreak && currentStreak.length > 1) {
                        streaks.push(currentStreak);
                    }
                    currentStreak = null;
                    return;
                }
                
                if (!currentStreak) {
                    // Start new streak
                    currentStreak = { start: date, end: date, length: 1 };
                } else {
                    // Check if this date is consecutive
                    const lastDate = new Date(currentStreak.end);
                    const nextDay = new Date(lastDate);
                    nextDay.setDate(lastDate.getDate() + 1);
                    const currentDate = new Date(date);
                    
                    if (currentDate.getTime() === nextDay.getTime()) {
                        // Consecutive day, extend streak
                        currentStreak.end = date;
                        currentStreak.length++;
                    } else {
                        // Non-consecutive, save streak and start new one
                        streaks.push(currentStreak);
                        currentStreak = { start: date, end: date, length: 1 };
                    }
                }
            });
            
            // Add final streak if exists
            if (currentStreak && currentStreak.length > 1) {
                streaks.push(currentStreak);
            }
            
        } else if (this.selectedWorkoutView === 'comparison') {
            // Show top streak for each workout type
            this.workoutTypes.forEach(type => {
                const typeStreak = this.calculateWorkoutTypeStreak(type);
                if (typeStreak && typeStreak.length > 1) {
                    streaks.push({
                        ...typeStreak,
                        type: type
                    });
                }
            });
            
        } else {
            // Individual workout type
            const selectedType = this.selectedWorkoutView.charAt(0).toUpperCase() + 
                                 this.selectedWorkoutView.slice(1);
            const typeStreaks = this.calculateAllWorkoutTypeStreaks(selectedType);
            streaks.push(...typeStreaks);
        }
        
        return streaks.sort((a, b) => b.length - a.length);
    }
    
    /**
     * Calculate streaks for specific workout type
     * @param {string} type - Workout type
     * @returns {Object|null} Best streak object or null
     */
    calculateWorkoutTypeStreak(type) {
        const sortedDates = Object.keys(this.workoutHistory).sort();
        let bestStreak = null;
        let currentStreak = null;
        
        sortedDates.forEach(date => {
            const entries = this.workoutHistory[date] || [];
            const hasWorkout = entries.some(entry => entry.type === type);
            
            if (!hasWorkout) {
                // No workout of this type, end streak
                if (currentStreak && currentStreak.length > 1) {
                    if (!bestStreak || currentStreak.length > bestStreak.length) {
                        bestStreak = currentStreak;
                    }
                }
                currentStreak = null;
                return;
            }
            
            if (!currentStreak) {
                // Start new streak
                currentStreak = { start: date, end: date, length: 1 };
            } else {
                // Check if consecutive
                const lastDate = new Date(currentStreak.end);
                const nextDay = new Date(lastDate);
                nextDay.setDate(lastDate.getDate() + 1);
                const currentDate = new Date(date);
                
                if (currentDate.getTime() === nextDay.getTime()) {
                    // Consecutive, extend streak
                    currentStreak.end = date;
                    currentStreak.length++;
                } else {
                    // Non-consecutive, save if best
                    if (!bestStreak || currentStreak.length > bestStreak.length) {
                        bestStreak = currentStreak;
                    }
                    currentStreak = { start: date, end: date, length: 1 };
                }
            }
        });
        
        // Check final streak
        if (currentStreak && currentStreak.length > 1) {
            if (!bestStreak || currentStreak.length > bestStreak.length) {
                bestStreak = currentStreak;
            }
        }
        
        return bestStreak;
    }
    
    /**
     * Calculate all streaks for a specific workout type
     * @param {string} type - Workout type
     * @returns {Array} Array of streak objects
     */
    calculateAllWorkoutTypeStreaks(type) {
        const sortedDates = Object.keys(this.workoutHistory).sort();
        const streaks = [];
        let currentStreak = null;
        
        sortedDates.forEach(date => {
            const entries = this.workoutHistory[date] || [];
            const hasWorkout = entries.some(entry => entry.type === type);
            
            if (!hasWorkout) {
                // No workout of this type, end streak
                if (currentStreak && currentStreak.length > 1) {
                    streaks.push(currentStreak);
                }
                currentStreak = null;
                return;
            }
            
            if (!currentStreak) {
                // Start new streak
                currentStreak = { start: date, end: date, length: 1 };
            } else {
                // Check if consecutive
                const lastDate = new Date(currentStreak.end);
                const nextDay = new Date(lastDate);
                nextDay.setDate(lastDate.getDate() + 1);
                const currentDate = new Date(date);
                
                if (currentDate.getTime() === nextDay.getTime()) {
                    // Consecutive, extend streak
                    currentStreak.end = date;
                    currentStreak.length++;
                } else {
                    // Non-consecutive, save and start new
                    streaks.push(currentStreak);
                    currentStreak = { start: date, end: date, length: 1 };
                }
            }
        });
        
        // Add final streak if exists
        if (currentStreak && currentStreak.length > 1) {
            streaks.push(currentStreak);
        }
        
        return streaks;
    }
}