// App State
const state = {
    remindersEnabled: true,
    workDays: [1, 2, 3, 4, 5], // Monday to Friday
    startTime: '09:00',
    lunchStart: '11:30',
    lunchEnd: '13:30',
    endTime: '17:30',
    reminderInterval: 120, // minutes
    soundEnabled: true,
    nextReminder: null,
    checkInterval: null,
    lastWorkStartNotification: null,
    lastWorkEndNotification: null
};

// DOM Elements
const elements = {
    reminderToggle: document.getElementById('reminderToggle'),
    nextReminderTime: document.getElementById('nextReminderTime'),
    reminderCountdown: document.getElementById('reminderCountdown'),
    scheduleList: document.getElementById('scheduleList'),
    statusIndicator: document.getElementById('statusIndicator'),
    mascotMessage: document.getElementById('mascotMessage'),
    notificationOverlay: document.getElementById('notificationOverlay'),
    dismissNotification: document.getElementById('dismissNotification'),
    snoozeNotification: document.getElementById('snoozeNotification'),
    navBtns: document.querySelectorAll('.nav-btn'),
    screens: document.querySelectorAll('.screen'),
    saveSettings: document.getElementById('saveSettings'),
    weekdayBtns: document.querySelectorAll('.weekday-btn'),
    intervalBtns: document.querySelectorAll('.interval-btn')
};

// Initialize App
function init() {
    loadSettings();
    setupEventListeners();
    updateScheduleDisplay();
    checkAndScheduleReminders();
    startCountdown();
}

// Load Settings from localStorage
function loadSettings() {
    const saved = localStorage.getItem('wellnessSettings');
    if (saved) {
        const settings = JSON.parse(saved);
        Object.assign(state, settings);
        applySettings();
    }
}

// Apply Settings to UI
function applySettings() {
    elements.reminderToggle.checked = state.remindersEnabled;
    document.getElementById('startTime').value = state.startTime;
    document.getElementById('lunchStart').value = state.lunchStart;
    document.getElementById('lunchEnd').value = state.lunchEnd;
    document.getElementById('endTime').value = state.endTime;
    document.getElementById('soundToggle').checked = state.soundEnabled;

    // Update weekday buttons
    elements.weekdayBtns.forEach(btn => {
        const day = parseInt(btn.dataset.day);
        btn.classList.toggle('active', state.workDays.includes(day));
    });

    // Update interval buttons
    elements.intervalBtns.forEach(btn => {
        const interval = parseInt(btn.dataset.interval);
        btn.classList.toggle('active', interval === state.reminderInterval);
    });
}

// Save Settings to localStorage
function saveSettings() {
    localStorage.setItem('wellnessSettings', JSON.stringify(state));
}

// Setup Event Listeners
function setupEventListeners() {
    // Reminder toggle
    elements.reminderToggle.addEventListener('change', (e) => {
        state.remindersEnabled = e.target.checked;
        updateStatusIndicator();
        saveSettings();
        checkAndScheduleReminders();
    });

    // Navigation
    elements.navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const screenId = btn.dataset.screen;
            switchScreen(screenId);

            // Update active nav button
            elements.navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Notification actions
    elements.dismissNotification.addEventListener('click', dismissNotification);
    elements.snoozeNotification.addEventListener('click', snoozeNotification);

    // Settings
    elements.saveSettings.addEventListener('click', saveSettingsFromUI);

    // Weekday selection
    elements.weekdayBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const day = parseInt(btn.dataset.day);
            const index = state.workDays.indexOf(day);

            if (index > -1) {
                state.workDays.splice(index, 1);
                btn.classList.remove('active');
            } else {
                state.workDays.push(day);
                btn.classList.add('active');
            }
        });
    });

    // Interval selection
    elements.intervalBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const interval = parseInt(btn.dataset.interval);
            state.reminderInterval = interval;

            elements.intervalBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

// Switch Screen
function switchScreen(screenId) {
    elements.screens.forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// Update Status Indicator
function updateStatusIndicator() {
    const statusDot = elements.statusIndicator.querySelector('.status-dot');
    const statusText = elements.statusIndicator.querySelector('.status-text');

    if (state.remindersEnabled && isWorkDay()) {
        statusDot.style.background = 'var(--success-color)';
        statusText.textContent = 'Active';
    } else if (!isWorkDay()) {
        statusDot.style.background = 'var(--text-secondary)';
        statusText.textContent = 'Weekend';
    } else {
        statusDot.style.background = 'var(--text-secondary)';
        statusText.textContent = 'Paused';
    }
}

// Check if today is a work day
function isWorkDay() {
    const today = new Date().getDay();
    return state.workDays.includes(today);
}

// Check if current time is within work hours
function isWorkHours() {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Check if within work hours
    if (currentTime < state.startTime || currentTime >= state.endTime) {
        return false;
    }

    // Check if during lunch break
    if (currentTime >= state.lunchStart && currentTime < state.lunchEnd) {
        return false;
    }

    return true;
}

// Calculate next reminder time
function calculateNextReminder() {
    if (!state.remindersEnabled || !isWorkDay()) {
        return null;
    }

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Parse times
    const [startHour, startMin] = state.startTime.split(':').map(Number);
    const [lunchStartHour, lunchStartMin] = state.lunchStart.split(':').map(Number);
    const [lunchEndHour, lunchEndMin] = state.lunchEnd.split(':').map(Number);
    const [endHour, endMin] = state.endTime.split(':').map(Number);

    // Create time objects for today
    const startOfWork = new Date(now);
    startOfWork.setHours(startHour, startMin, 0, 0);

    const lunchTime = new Date(now);
    lunchTime.setHours(lunchStartHour, lunchStartMin, 0, 0);

    const endOfLunch = new Date(now);
    endOfLunch.setHours(lunchEndHour, lunchEndMin, 0, 0);

    const endOfWork = new Date(now);
    endOfWork.setHours(endHour, endMin, 0, 0);

    // If before work starts, next reminder is at start time
    if (now < startOfWork) {
        return startOfWork;
    }

    // If after work ends, no more reminders today
    if (now >= endOfWork) {
        return null;
    }

    // Calculate reminders during work hours
    let nextReminder = new Date(startOfWork);

    while (nextReminder <= now) {
        nextReminder = new Date(nextReminder.getTime() + state.reminderInterval * 60000);
    }

    // Skip lunch time
    if (nextReminder >= lunchTime && nextReminder < endOfLunch) {
        nextReminder = new Date(endOfLunch);
    }

    // Check if next reminder is after work ends
    if (nextReminder >= endOfWork) {
        return null;
    }

    return nextReminder;
}

// Check and schedule reminders
function checkAndScheduleReminders() {
    state.nextReminder = calculateNextReminder();
    updateReminderDisplay();
    updateStatusIndicator();
    updateMascotMessage();
}

// Update reminder display
function updateReminderDisplay() {
    if (state.nextReminder) {
        const hours = String(state.nextReminder.getHours()).padStart(2, '0');
        const minutes = String(state.nextReminder.getMinutes()).padStart(2, '0');
        elements.nextReminderTime.textContent = `${hours}:${minutes}`;
    } else {
        // Check if work end notification is still coming today
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        if (isWorkDay() && state.remindersEnabled && currentTime < state.endTime) {
            // Show work end time as next reminder
            elements.nextReminderTime.textContent = state.endTime;
            elements.reminderCountdown.textContent = 'Work end notification';
        } else {
            elements.nextReminderTime.textContent = '--:--';
            elements.reminderCountdown.textContent = isWorkDay() ? 'No more reminders today' : 'Enjoy your weekend!';
        }
    }
}

// Start countdown timer
function startCountdown() {
    if (state.checkInterval) {
        clearInterval(state.checkInterval);
    }

    state.checkInterval = setInterval(() => {
        updateCountdown();

        // Check if it's time for a reminder
        if (state.nextReminder) {
            const now = new Date();
            if (now >= state.nextReminder) {
                showNotification();
                checkAndScheduleReminders();
            }
        }

        // Check for work start notification
        checkWorkStartNotification();

        // Check for work end notification
        checkWorkEndNotification();
    }, 1000);
}

// Update countdown display
function updateCountdown() {
    if (!state.nextReminder) {
        return;
    }

    const now = new Date();
    const diff = state.nextReminder - now;

    if (diff <= 0) {
        elements.reminderCountdown.textContent = 'Time to stand up!';
        return;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (hours > 0) {
        elements.reminderCountdown.textContent = `in ${hours}h ${minutes}m`;
    } else if (minutes > 0) {
        elements.reminderCountdown.textContent = `in ${minutes}m ${seconds}s`;
    } else {
        elements.reminderCountdown.textContent = `in ${seconds}s`;
    }
}

// Update mascot message
function updateMascotMessage() {
    const messages = {
        active: [
            "Ready to keep you healthy! 🐾",
            "Let's stay active together! 🐕",
            "I'll remind you to stretch! 🎾",
            "Your wellness buddy is here! 🦴"
        ],
        paused: [
            "Reminders are paused 😴",
            "Taking a break too! 🛌"
        ],
        weekend: [
            "Enjoy your weekend! 🎉",
            "Rest and relax! 🌟",
            "See you on Monday! 🐾"
        ]
    };

    let messageArray;
    if (!state.remindersEnabled) {
        messageArray = messages.paused;
    } else if (!isWorkDay()) {
        messageArray = messages.weekend;
    } else {
        messageArray = messages.active;
    }

    const randomMessage = messageArray[Math.floor(Math.random() * messageArray.length)];
    elements.mascotMessage.textContent = randomMessage;
}

// Update schedule display
function updateScheduleDisplay() {
    const schedule = [
        { time: state.startTime, label: 'Work Starts', icon: '🐕' },
        { time: state.lunchStart, label: 'Lunch Time', icon: '🍖' },
        { time: state.lunchEnd, label: 'Back to Work', icon: '💼' },
        { time: state.endTime, label: 'Work Ends', icon: '🎉' }
    ];

    // Add stand-up reminders
    const [startHour, startMin] = state.startTime.split(':').map(Number);
    const [lunchStartHour] = state.lunchStart.split(':').map(Number);
    const [lunchEndHour, lunchEndMin] = state.lunchEnd.split(':').map(Number);
    const [endHour] = state.endTime.split(':').map(Number);

    let currentHour = startHour;
    let currentMin = startMin;

    while (true) {
        currentMin += state.reminderInterval;
        if (currentMin >= 60) {
            currentHour += Math.floor(currentMin / 60);
            currentMin = currentMin % 60;
        }

        const timeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;

        // Stop if past end time
        if (currentHour >= endHour) break;

        // Skip lunch time
        if (currentHour >= lunchStartHour && currentHour < lunchEndHour) {
            currentHour = lunchEndHour;
            currentMin = lunchEndMin;
            continue;
        }

        schedule.push({ time: timeStr, label: 'Stand Up Break', icon: '🧘' });
    }

    // Sort by time
    schedule.sort((a, b) => a.time.localeCompare(b.time));

    // Render schedule
    elements.scheduleList.innerHTML = schedule.map(item => {
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const isActive = isWorkDay() && currentTime >= item.time && currentTime < getNextTime(schedule, item.time);

        return `
            <div class="schedule-item ${isActive ? 'active' : ''}">
                <div class="schedule-icon">${item.icon}</div>
                <div class="schedule-info">
                    <div class="schedule-time">${item.time}</div>
                    <div class="schedule-label">${item.label}</div>
                </div>
            </div>
        `;
    }).join('');
}

// Get next time in schedule
function getNextTime(schedule, currentTime) {
    const currentIndex = schedule.findIndex(item => item.time === currentTime);
    if (currentIndex < schedule.length - 1) {
        return schedule[currentIndex + 1].time;
    }
    return '23:59';
}

// Show notification
function showNotification() {
    elements.notificationOverlay.classList.add('show');

    // Play sound if enabled
    if (state.soundEnabled) {
        playNotificationSound();
    }

    // Request browser notification permission
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Time to Stand Up! 🐾', {
            body: "You've been sitting for a while. Let's stretch and move!",
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="%236B9FFF"/></svg>'
        });
    }
}

// Check and show work start notification
function checkWorkStartNotification() {
    if (!state.remindersEnabled || !isWorkDay()) {
        return;
    }

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const today = now.toDateString();

    // Check if it's work start time and we haven't shown notification today
    if (currentTime === state.startTime && state.lastWorkStartNotification !== today) {
        showWorkStartNotification();
        state.lastWorkStartNotification = today;
    }
}

// Show work start notification
function showWorkStartNotification() {
    // Update notification content
    const notificationTitle = document.querySelector('.notification-title');
    const notificationMessage = document.querySelector('.notification-message');

    notificationTitle.textContent = 'Good Morning! ☀️';
    notificationMessage.textContent = "Time to start the day! Let's stay healthy and productive together! 🐾";

    elements.notificationOverlay.classList.add('show');

    // Play sound if enabled
    if (state.soundEnabled) {
        playNotificationSound();
    }

    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Good Morning! ☀️', {
            body: "Time to start the day! Let's stay healthy and productive together!",
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="%236B9FFF"/></svg>'
        });
    }

    // Reset notification content after dismissal
    setTimeout(() => {
        notificationTitle.textContent = 'Time to Stand Up! 🐾';
        notificationMessage.textContent = "You've been sitting for a while. Let's stretch and move!";
    }, 100);
}

// Check and show work end notification
function checkWorkEndNotification() {
    if (!state.remindersEnabled || !isWorkDay()) {
        return;
    }

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const today = now.toDateString();

    // Check if it's work end time and we haven't shown notification today
    if (currentTime === state.endTime && state.lastWorkEndNotification !== today) {
        showWorkEndNotification();
        state.lastWorkEndNotification = today;
    }
}

// Show work end notification
function showWorkEndNotification() {
    // Update notification content
    const notificationTitle = document.querySelector('.notification-title');
    const notificationMessage = document.querySelector('.notification-message');

    notificationTitle.textContent = 'Great Job Today! 🎉';
    notificationMessage.textContent = "Work is done! Time to relax and enjoy your evening! You've earned it! 💙";

    elements.notificationOverlay.classList.add('show');

    // Play sound if enabled
    if (state.soundEnabled) {
        playNotificationSound();
    }

    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Great Job Today! 🎉', {
            body: "Work is done! Time to relax and enjoy your evening!",
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="%236B9FFF"/></svg>'
        });
    }

    // Reset notification content after dismissal
    setTimeout(() => {
        notificationTitle.textContent = 'Time to Stand Up! 🐾';
        notificationMessage.textContent = "You've been sitting for a while. Let's stretch and move!";
    }, 100);
}


// Dismiss notification
function dismissNotification() {
    elements.notificationOverlay.classList.remove('show');
}

// Snooze notification
function snoozeNotification() {
    elements.notificationOverlay.classList.remove('show');

    // Add 10 minutes to next reminder
    if (state.nextReminder) {
        state.nextReminder = new Date(state.nextReminder.getTime() + 10 * 60000);
        updateReminderDisplay();
    }
}

// Play notification sound
function playNotificationSound() {
    // Create a simple beep sound using Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
}

// Save settings from UI
function saveSettingsFromUI() {
    state.startTime = document.getElementById('startTime').value;
    state.lunchStart = document.getElementById('lunchStart').value;
    state.lunchEnd = document.getElementById('lunchEnd').value;
    state.endTime = document.getElementById('endTime').value;
    state.soundEnabled = document.getElementById('soundToggle').checked;

    saveSettings();
    updateScheduleDisplay();
    checkAndScheduleReminders();

    // Show feedback
    const btn = elements.saveSettings;
    const originalText = btn.textContent;
    btn.textContent = 'Saved! ✓';
    btn.style.background = 'linear-gradient(135deg, var(--success-color) 0%, #7FD87F 100%)';

    setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '';
    }, 2000);
}

// Request notification permission
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Request notification permission after a short delay
setTimeout(requestNotificationPermission, 3000);

// Register Service Worker for PWA functionality
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('Service Worker registered successfully:', registration.scope);
            })
            .catch(error => {
                console.log('Service Worker registration failed:', error);
            });
    });
}
