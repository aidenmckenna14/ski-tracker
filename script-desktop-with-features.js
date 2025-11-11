// Desktop version with all features including weather alerts
let currentUser = 'aiden';
let allSkiDays = JSON.parse(localStorage.getItem('allSkiDays')) || {
    aiden: [],
    jack: [],
    matt: [],
    mike: [],
    reece: []
};

// New England ski resorts  
const newEnglandResorts = [
    // Vermont - Your local mountains
    { name: 'Bolton Valley', lat: 44.4217, lon: -72.8497 },
    { name: 'Stowe', lat: 44.5303, lon: -72.7814 },
    { name: 'Jay Peak', lat: 44.9379, lon: -72.5045 },
    { name: 'Killington', lat: 43.6773, lon: -72.7933 },
    { name: 'Sugarbush', lat: 44.1359, lon: -72.8944 },
    { name: 'Mad River Glen', lat: 44.2025, lon: -72.9175 },
    { name: 'Smugglers Notch', lat: 44.5758, lon: -72.7761 },
    { name: 'Mount Snow', lat: 42.9602, lon: -72.9204 },
    { name: 'Okemo', lat: 43.4018, lon: -72.7170 },
    { name: 'Stratton', lat: 43.1135, lon: -72.9082 },
    // New Hampshire
    { name: 'Bretton Woods', lat: 44.2581, lon: -71.4375 },
    { name: 'Cannon Mountain', lat: 44.1564, lon: -71.6989 },
    { name: 'Loon Mountain', lat: 44.0364, lon: -71.6203 },
    { name: 'Waterville Valley', lat: 43.9667, lon: -71.5167 },
    { name: 'Wildcat', lat: 44.2592, lon: -71.2031 },
    { name: 'Attitash', lat: 44.1103, lon: -71.2578 },
    { name: 'Sunday River', lat: 44.4689, lon: -70.8644 },
    { name: 'Sugarloaf', lat: 45.0314, lon: -70.3128 }
];

// Badge definitions
const badges = [
    { id: 'first_day', name: 'First Tracks', desc: 'Log your first ski day', icon: '🎿', check: (days) => days.length > 0 },
    { id: 'powder_hound', name: 'Powder Hound', desc: 'Ski 3 powder days', icon: '❄️', check: (days) => days.filter(d => d.conditions === 'Powder').length >= 3 },
    { id: 'weekend_warrior', name: 'Weekend Warrior', desc: '10 weekend days', icon: '🏔️', check: (days) => days.filter(d => [0, 6].includes(new Date(d.date).getDay())).length >= 10 },
    { id: 'early_bird', name: 'Early Bird', desc: 'Ski in November', icon: '🌅', check: (days) => days.some(d => new Date(d.date).getMonth() === 10) },
    { id: 'spring_sender', name: 'Spring Sender', desc: 'Ski in April', icon: '🌸', check: (days) => days.some(d => new Date(d.date).getMonth() === 3) },
    { id: 'mountain_master', name: 'Mountain Master', desc: 'Ski 5 different resorts', icon: '⛰️', check: (days) => [...new Set(days.map(d => d.resort))].length >= 5 },
    { id: 'storm_chaser', name: 'Storm Chaser', desc: 'Ski in 12"+ storm', icon: '🌨️', check: (days) => days.some(d => d.snowfall >= 12) },
    { id: 'cold_warrior', name: 'Cold Warrior', desc: 'Ski below 0°F', icon: '🥶', check: (days) => days.some(d => parseInt(d.temperature) < 0) },
    { id: 'century_club', name: 'Century Club', desc: 'Log 100 ski days', icon: '💯', check: (days) => days.length >= 100 },
    { id: 'loyal_local', name: 'Loyal Local', desc: '20 days at one resort', icon: '🏠', check: (days) => Object.values(days.reduce((acc, d) => { acc[d.resort] = (acc[d.resort] || 0) + 1; return acc; }, {})).some(count => count >= 20) }
];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Ensure all users have arrays
    ['aiden', 'jack', 'matt', 'mike', 'reece'].forEach(user => {
        if (!allSkiDays[user]) {
            allSkiDays[user] = [];
        }
    });
    
    currentUser = document.getElementById('user-select').value;
    showSection('add');
    displaySkiDays();
    updateStats();
    initializeWeatherAlerts();
    
    // Set up Firebase sync after everything loads
    setTimeout(setupFirebaseSync, 1000);
});

// Section navigation
window.showSection = function(section) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    document.getElementById(section + '-section').classList.add('active');
    event.target.classList.add('active');
    
    if (section === 'stats') {
        updateStatsView();
    } else if (section === 'goals') {
        displayGoalsAndBadges();
    } else if (section === 'pass') {
        updatePassROI();
    } else if (section === 'weather') {
        displayWeatherAlerts();
    }
}

// Firebase sync
function setupFirebaseSync() {
    if (typeof firebase === 'undefined') {
        console.log('Firebase not loaded');
        return;
    }
    
    try {
        const db = firebase.database();
        
        // Listen for changes from Firebase
        db.ref('skiDays').on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                allSkiDays = data;
                localStorage.setItem('allSkiDays', JSON.stringify(allSkiDays));
                displaySkiDays();
                updateStats();
            }
        });
        
        // Listen for weather settings changes from Firebase
        db.ref('weatherSettings').on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                localStorage.setItem('weatherSettings', JSON.stringify(data));
                
                // Update UI if weather section is open
                if (document.getElementById('weather-api-key')) {
                    document.getElementById('weather-api-key').value = data.apiKey || '';
                    document.getElementById('enable-alerts').checked = data.enableAlerts || false;
                    document.getElementById('snow-threshold').value = data.snowThreshold || 6;
                    
                    // Update resort checkboxes
                    document.querySelectorAll('#resort-checkboxes input').forEach(cb => {
                        cb.checked = data.selectedResorts && 
                                   data.selectedResorts.includes(cb.value);
                    });
                }
            }
        });
        
        console.log('Firebase sync enabled');
    } catch (error) {
        console.error('Firebase setup error:', error);
    }
}

// Save to Firebase
function saveToFirebase() {
    if (typeof firebase === 'undefined') return;
    
    try {
        firebase.database().ref('skiDays').set(allSkiDays);
    } catch (error) {
        console.error('Firebase save error:', error);
    }
}

// User change
document.getElementById('user-select').addEventListener('change', (e) => {
    currentUser = e.target.value;
    displaySkiDays();
    updateStats();
});

// Form submission
document.getElementById('ski-day-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const newSkiDay = {
        id: Date.now(),
        date: document.getElementById('date').value,
        resort: document.getElementById('resort').value,
        conditions: document.getElementById('conditions').value,
        snowfall: parseFloat(document.getElementById('snowfall').value) || 0,
        temperature: document.getElementById('temperature').value,
        weather: document.getElementById('weather').value,
        runs: document.getElementById('runs').value,
        notes: document.getElementById('notes').value
    };
    
    if (!allSkiDays[currentUser]) {
        allSkiDays[currentUser] = [];
    }
    
    allSkiDays[currentUser].push(newSkiDay);
    allSkiDays[currentUser].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    localStorage.setItem('allSkiDays', JSON.stringify(allSkiDays));
    saveToFirebase();
    
    displaySkiDays();
    updateStats();
    checkBadges();
    document.getElementById('ski-day-form').reset();
    showFeedback('Ski day added!');
});

// Display ski days
function displaySkiDays() {
    const daysList = document.getElementById('days-list');
    daysList.innerHTML = '';
    const currentDays = allSkiDays[currentUser] || [];
    
    if (currentDays.length === 0) {
        daysList.innerHTML = '<p style="text-align: center; color: #546E7A;">No ski days recorded yet. Start tracking your adventures!</p>';
        return;
    }
    
    currentDays.forEach(day => {
        const dayCard = createDayCard(day);
        daysList.appendChild(dayCard);
    });
}

// Create day card
function createDayCard(day) {
    const card = document.createElement('div');
    card.className = 'ski-day-card';
    
    const formattedDate = new Date(day.date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    card.innerHTML = `
        <button class="edit-btn" onclick="editSkiDay(${day.id})">Edit</button>
        <button class="delete-btn" onclick="deleteSkiDay(${day.id})">Delete</button>
        <h3>${day.resort} - ${formattedDate}</h3>
        <div class="day-details">
            <div class="detail-item">
                <span class="detail-label">Conditions:</span> ${day.conditions}
            </div>
            <div class="detail-item">
                <span class="detail-label">New Snow:</span> ${day.snowfall}"
            </div>
            <div class="detail-item">
                <span class="detail-label">Temperature:</span> ${day.temperature}°F
            </div>
            <div class="detail-item">
                <span class="detail-label">Weather:</span> ${day.weather}
            </div>
            ${day.runs ? `
            <div class="detail-item" style="grid-column: 1 / -1;">
                <span class="detail-label">Runs:</span> ${day.runs}
            </div>` : ''}
            ${day.notes ? `
            <div class="detail-item" style="grid-column: 1 / -1;">
                <span class="detail-label">Notes:</span> ${day.notes}
            </div>` : ''}
        </div>
    `;
    
    return card;
}

// Edit function
window.editSkiDay = function(id) {
    const day = allSkiDays[currentUser].find(d => d.id === id);
    if (!day) return;
    
    document.getElementById('edit-id').value = day.id;
    document.getElementById('edit-date').value = day.date;
    document.getElementById('edit-resort').value = day.resort;
    document.getElementById('edit-conditions').value = day.conditions;
    document.getElementById('edit-snowfall').value = day.snowfall;
    document.getElementById('edit-temperature').value = day.temperature;
    document.getElementById('edit-weather').value = day.weather;
    document.getElementById('edit-runs').value = day.runs;
    document.getElementById('edit-notes').value = day.notes;
    
    document.getElementById('edit-modal').style.display = 'block';
}

// Delete function
window.deleteSkiDay = function(id) {
    if (confirm('Are you sure you want to delete this ski day?')) {
        allSkiDays[currentUser] = allSkiDays[currentUser].filter(day => day.id !== id);
        localStorage.setItem('allSkiDays', JSON.stringify(allSkiDays));
        saveToFirebase();
        displaySkiDays();
        updateStats();
        showFeedback('Ski day deleted.');
    }
}

// Update stats
function updateStats() {
    const currentDays = allSkiDays[currentUser] || [];
    document.getElementById('total-days').textContent = currentDays.length;
    
    const totalSnow = currentDays.reduce((sum, day) => sum + day.snowfall, 0);
    document.getElementById('total-snow').textContent = totalSnow.toFixed(1) + '"';
}

// Modal handling
document.querySelector('.close').addEventListener('click', () => {
    document.getElementById('edit-modal').style.display = 'none';
});

document.getElementById('edit-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const id = parseInt(document.getElementById('edit-id').value);
    const dayIndex = allSkiDays[currentUser].findIndex(d => d.id === id);
    
    if (dayIndex !== -1) {
        allSkiDays[currentUser][dayIndex] = {
            id: id,
            date: document.getElementById('edit-date').value,
            resort: document.getElementById('edit-resort').value,
            conditions: document.getElementById('edit-conditions').value,
            snowfall: parseFloat(document.getElementById('edit-snowfall').value) || 0,
            temperature: document.getElementById('edit-temperature').value,
            weather: document.getElementById('edit-weather').value,
            runs: document.getElementById('edit-runs').value,
            notes: document.getElementById('edit-notes').value
        };
        
        allSkiDays[currentUser].sort((a, b) => new Date(b.date) - new Date(a.date));
        localStorage.setItem('allSkiDays', JSON.stringify(allSkiDays));
        saveToFirebase();
        
        displaySkiDays();
        updateStats();
        document.getElementById('edit-modal').style.display = 'none';
        showFeedback('Ski day updated!');
    }
});

// Stats views
window.updateStatsView = function() {
    const view = document.getElementById('stats-view').value;
    const content = document.getElementById('stats-content');
    
    switch(view) {
        case 'leaders':
            showSeasonLeaders(content);
            break;
        case 'mountains':
            showMountainStats(content);
            break;
        case 'extremes':
            showExtremeStats(content);
            break;
        case 'compare':
            showCompareSkiers(content);
            break;
    }
}

function showSeasonLeaders(container) {
    const leaderboard = Object.entries(allSkiDays)
        .map(([user, days]) => ({
            name: user.charAt(0).toUpperCase() + user.slice(1),
            days: days.length,
            snow: days.reduce((sum, d) => sum + d.snowfall, 0),
            resorts: [...new Set(days.map(d => d.resort))].length,
            powderDays: days.filter(d => d.conditions === 'Powder').length
        }))
        .sort((a, b) => b.days - a.days);
    
    container.innerHTML = `
        <h3>Season Leaders</h3>
        <div class="leaderboard">
            ${leaderboard.map((leader, index) => `
                <div class="leader-card">
                    <div class="leader-rank">#${index + 1}</div>
                    <div class="leader-info">
                        <h4>${leader.name}</h4>
                        <div class="leader-stats">
                            <span>${leader.days} days</span>
                            <span>${leader.snow.toFixed(1)}" snow</span>
                            <span>${leader.resorts} resorts</span>
                            <span>${leader.powderDays} powder days</span>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function showMountainStats(container) {
    const allDays = Object.values(allSkiDays).flat();
    const mountainCounts = allDays.reduce((acc, day) => {
        acc[day.resort] = (acc[day.resort] || 0) + 1;
        return acc;
    }, {});
    
    const sorted = Object.entries(mountainCounts)
        .sort((a, b) => b[1] - a[1]);
    
    container.innerHTML = `
        <h3>Most Visited Mountains</h3>
        <div class="mountain-stats">
            ${sorted.map(([mountain, count]) => `
                <div class="mountain-item">
                    <span class="mountain-name">${mountain}</span>
                    <span class="mountain-count">${count} visits</span>
                </div>
            `).join('')}
        </div>
    `;
}

function showExtremeStats(container) {
    const allDays = Object.entries(allSkiDays)
        .flatMap(([user, days]) => days.map(d => ({...d, user})));
    
    const deepestDay = allDays.reduce((max, day) => 
        day.snowfall > (max?.snowfall || 0) ? day : max, null);
    
    const coldestDay = allDays.reduce((min, day) => 
        parseInt(day.temperature) < parseInt(min?.temperature || 999) ? day : min, null);
    
    container.innerHTML = `
        <h3>Extreme Days</h3>
        <div class="extreme-stats">
            ${deepestDay ? `
                <div class="extreme-item">
                    <h4>Deepest Day</h4>
                    <p>${deepestDay.snowfall}" at ${deepestDay.resort}</p>
                    <p>${new Date(deepestDay.date).toLocaleDateString()}</p>
                    <p class="extreme-user">- ${deepestDay.user.charAt(0).toUpperCase() + deepestDay.user.slice(1)}</p>
                </div>
            ` : ''}
            ${coldestDay ? `
                <div class="extreme-item">
                    <h4>Coldest Day</h4>
                    <p>${coldestDay.temperature}°F at ${coldestDay.resort}</p>
                    <p>${new Date(coldestDay.date).toLocaleDateString()}</p>
                    <p class="extreme-user">- ${coldestDay.user.charAt(0).toUpperCase() + coldestDay.user.slice(1)}</p>
                </div>
            ` : ''}
        </div>
    `;
}

function showCompareSkiers(container) {
    container.innerHTML = `
        <h3>Compare Skiers</h3>
        <div class="compare-selects">
            <select id="compare1" onchange="updateComparison()">
                ${Object.keys(allSkiDays).map(user => 
                    `<option value="${user}">${user.charAt(0).toUpperCase() + user.slice(1)}</option>`
                ).join('')}
            </select>
            <span>vs</span>
            <select id="compare2" onchange="updateComparison()">
                ${Object.keys(allSkiDays).map(user => 
                    `<option value="${user}">${user.charAt(0).toUpperCase() + user.slice(1)}</option>`
                ).join('')}
            </select>
        </div>
        <div id="comparison-results"></div>
    `;
    
    document.getElementById('compare2').selectedIndex = 1;
    updateComparison();
}

window.updateComparison = function() {
    const user1 = document.getElementById('compare1').value;
    const user2 = document.getElementById('compare2').value;
    const days1 = allSkiDays[user1] || [];
    const days2 = allSkiDays[user2] || [];
    
    const stats = [
        {
            label: 'Total Days',
            val1: days1.length,
            val2: days2.length
        },
        {
            label: 'Total Snow',
            val1: days1.reduce((sum, d) => sum + d.snowfall, 0).toFixed(1) + '"',
            val2: days2.reduce((sum, d) => sum + d.snowfall, 0).toFixed(1) + '"'
        },
        {
            label: 'Powder Days',
            val1: days1.filter(d => d.conditions === 'Powder').length,
            val2: days2.filter(d => d.conditions === 'Powder').length
        },
        {
            label: 'Different Resorts',
            val1: [...new Set(days1.map(d => d.resort))].length,
            val2: [...new Set(days2.map(d => d.resort))].length
        }
    ];
    
    document.getElementById('comparison-results').innerHTML = `
        <div class="comparison-grid">
            ${stats.map(stat => `
                <div class="compare-stat">
                    <h4>${stat.label}</h4>
                    <div class="compare-values">
                        <span class="${parseFloat(stat.val1) > parseFloat(stat.val2) ? 'winner' : ''}">${stat.val1}</span>
                        <span class="${parseFloat(stat.val2) > parseFloat(stat.val1) ? 'winner' : ''}">${stat.val2}</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Goals and Badges
function displayGoalsAndBadges() {
    displayGoals();
    displayBadges();
}

function displayGoals() {
    const goals = JSON.parse(localStorage.getItem('skiGoals')) || {};
    const userGoals = goals[currentUser] || [];
    const currentDays = allSkiDays[currentUser] || [];
    
    const goalsHtml = userGoals.map(goal => {
        const progress = calculateGoalProgress(goal, currentDays);
        const isComplete = progress >= 100;
        
        return `
            <div class="goal-card ${isComplete ? 'complete' : ''}">
                <h4>${goal.type === 'days' ? `${goal.target} Days Goal` : `Visit ${goal.target} Resorts`}</h4>
                <div class="goal-progress">
                    <div class="progress-bar" style="width: ${Math.min(progress, 100)}%"></div>
                </div>
                <p>${goal.current} / ${goal.target} ${isComplete ? '✓' : ''}</p>
            </div>
        `;
    }).join('');
    
    document.getElementById('goals-list').innerHTML = goalsHtml || '<p>No goals set yet.</p>';
}

function calculateGoalProgress(goal, days) {
    if (goal.type === 'days') {
        goal.current = days.length;
    } else if (goal.type === 'resorts') {
        goal.current = [...new Set(days.map(d => d.resort))].length;
    }
    return (goal.current / goal.target) * 100;
}

window.showAddGoalForm = function() {
    const form = document.createElement('div');
    form.className = 'goal-form';
    form.innerHTML = `
        <h3>Set New Goal</h3>
        <select id="goal-type">
            <option value="days">Number of Days</option>
            <option value="resorts">Different Resorts</option>
        </select>
        <input type="number" id="goal-target" placeholder="Target number" min="1">
        <div>
            <button onclick="saveGoal()">Save Goal</button>
            <button onclick="this.parentElement.parentElement.remove()">Cancel</button>
        </div>
    `;
    document.getElementById('goals-list').appendChild(form);
}

window.saveGoal = function() {
    const type = document.getElementById('goal-type').value;
    const target = parseInt(document.getElementById('goal-target').value);
    
    if (!target) return;
    
    const goals = JSON.parse(localStorage.getItem('skiGoals')) || {};
    if (!goals[currentUser]) goals[currentUser] = [];
    
    goals[currentUser].push({
        type: type,
        target: target,
        current: 0,
        created: new Date().toISOString()
    });
    
    localStorage.setItem('skiGoals', JSON.stringify(goals));
    displayGoals();
}

function displayBadges() {
    const currentDays = allSkiDays[currentUser] || [];
    
    const badgeHtml = badges.map(badge => {
        const earned = badge.check(currentDays);
        return `
            <div class="badge ${earned ? 'earned' : 'locked'}">
                <div class="badge-icon">${badge.icon}</div>
                <div class="badge-name">${badge.name}</div>
                <div class="badge-desc">${badge.desc}</div>
            </div>
        `;
    }).join('');
    
    document.getElementById('badges-grid').innerHTML = badgeHtml;
}

function checkBadges() {
    const currentDays = allSkiDays[currentUser] || [];
    const earnedBadges = JSON.parse(localStorage.getItem('earnedBadges')) || {};
    if (!earnedBadges[currentUser]) earnedBadges[currentUser] = [];
    
    badges.forEach(badge => {
        if (badge.check(currentDays) && !earnedBadges[currentUser].includes(badge.id)) {
            earnedBadges[currentUser].push(badge.id);
            showFeedback(`Badge Earned: ${badge.name}!`);
        }
    });
    
    localStorage.setItem('earnedBadges', JSON.stringify(earnedBadges));
}

// Season Pass ROI
window.updatePassROI = function() {
    const passPrice = parseFloat(document.getElementById('pass-price').value) || 599;
    const dailyPrice = 89; // Bolton Valley day ticket estimate
    
    // Calculate total days and savings
    let totalDays = 0;
    let userStats = [];
    
    Object.entries(allSkiDays).forEach(([user, days]) => {
        const boltonDays = days.filter(d => 
            d.resort.toLowerCase().includes('bolton')
        ).length;
        totalDays += boltonDays;
        
        const userValue = boltonDays * dailyPrice;
        const userShare = passPrice / 5; // Split among 5 users
        const userSavings = userValue - userShare;
        
        userStats.push({
            name: user.charAt(0).toUpperCase() + user.slice(1),
            days: boltonDays,
            value: userValue,
            share: userShare,
            savings: userSavings
        });
    });
    
    const totalValue = totalDays * dailyPrice;
    const totalSavings = totalValue - passPrice;
    const breakEvenDays = Math.ceil(passPrice / dailyPrice);
    
    document.getElementById('pass-stats').innerHTML = `
        <div class="roi-summary">
            <div class="roi-stat">
                <h4>Total Bolton Days</h4>
                <div class="big-number">${totalDays}</div>
            </div>
            <div class="roi-stat">
                <h4>Total Value</h4>
                <div class="big-number">$${totalValue}</div>
            </div>
            <div class="roi-stat">
                <h4>Total Savings</h4>
                <div class="big-number ${totalSavings >= 0 ? 'savings' : 'loss'}">
                    $${Math.abs(totalSavings)}
                </div>
            </div>
        </div>
        <p style="text-align: center; margin-top: 20px;">
            Break-even: ${breakEvenDays} days (${Math.max(0, breakEvenDays - totalDays)} more needed)
        </p>
    `;
    
    document.getElementById('user-pass-stats').innerHTML = userStats
        .sort((a, b) => b.days - a.days)
        .map(user => `
            <div class="user-roi-card">
                <h4>${user.name}</h4>
                <div class="roi-details">
                    <span>${user.days} days = $${user.value} value</span>
                    <span class="${user.savings >= 0 ? 'savings' : 'loss'}">
                        ${user.savings >= 0 ? 'Saved' : 'Loss'}: $${Math.abs(user.savings.toFixed(0))}
                    </span>
                </div>
            </div>
        `).join('');
}

// Weather Alerts
function initializeWeatherAlerts() {
    // Checkboxes are now in HTML, just load saved settings
    const weatherSettings = JSON.parse(localStorage.getItem('weatherSettings')) || {};
    
    if (weatherSettings.apiKey && document.getElementById('weather-api-key')) {
        document.getElementById('weather-api-key').value = weatherSettings.apiKey;
    }
    if (weatherSettings.enableAlerts !== undefined) {
        document.getElementById('enable-alerts').checked = weatherSettings.enableAlerts;
    }
    if (weatherSettings.snowThreshold) {
        document.getElementById('snow-threshold').value = weatherSettings.snowThreshold;
    }
    
    // Update checkbox states based on saved settings
    if (weatherSettings.selectedResorts) {
        document.querySelectorAll('#resort-checkboxes input[type="checkbox"]').forEach(cb => {
            cb.checked = weatherSettings.selectedResorts.includes(cb.value);
        });
    }
}

window.saveWeatherSettings = function() {
    const settings = {
        apiKey: document.getElementById('weather-api-key').value,
        enableAlerts: document.getElementById('enable-alerts').checked,
        snowThreshold: parseInt(document.getElementById('snow-threshold').value),
        selectedResorts: Array.from(document.querySelectorAll('#resort-checkboxes input:checked'))
            .map(cb => cb.value)
    };
    
    localStorage.setItem('weatherSettings', JSON.stringify(settings));
    
    // Save to Firebase so everyone can use the same API key
    if (settings.apiKey && typeof firebase !== 'undefined') {
        try {
            firebase.database().ref('weatherSettings').set(settings);
        } catch (error) {
            console.error('Error saving weather settings to Firebase:', error);
        }
    }
    
    showFeedback('Weather settings saved for everyone!');
    
    if (settings.apiKey && settings.enableAlerts) {
        checkWeatherAlerts();
    }
}

async function checkWeatherAlerts() {
    const settings = JSON.parse(localStorage.getItem('weatherSettings')) || {};
    if (!settings.apiKey || !settings.enableAlerts) return;
    
    const today = new Date().toDateString();
    const cachedData = JSON.parse(localStorage.getItem('weatherCache')) || {};
    
    // Check if we have recent data (within 6 hours)
    if (cachedData.date === today && cachedData.timestamp && 
        Date.now() - cachedData.timestamp < 6 * 60 * 60 * 1000) {
        displayWeatherAlerts(cachedData.data);
        return;
    }
    
    // Check API call count
    let apiCalls = JSON.parse(localStorage.getItem('weatherApiCalls')) || {};
    if (apiCalls.date !== today) {
        apiCalls = { date: today, count: 0 };
    }
    
    if (apiCalls.count >= 900) {
        document.getElementById('alerts-list').innerHTML = 
            '<p style="color: var(--warning-red);">Daily API limit reached. Try again tomorrow.</p>';
        return;
    }
    
    const selectedResorts = settings.selectedResorts || newEnglandResorts.map(r => r.name);
    const alerts = [];
    const forecasts = [];
    
    for (const resort of newEnglandResorts) {
        if (!selectedResorts.includes(resort.name)) continue;
        
        try {
            const response = await fetch(
                `https://api.openweathermap.org/data/2.5/forecast?lat=${resort.lat}&lon=${resort.lon}&appid=${settings.apiKey}&units=imperial`
            );
            
            if (response.ok) {
                apiCalls.count++;
                const data = await response.json();
                
                // Check for snow in forecast
                let totalSnow = 0;
                let hasSnow = false;
                
                data.list.slice(0, 16).forEach(period => { // Next 48 hours
                    if (period.weather[0].main === 'Snow' && period.snow) {
                        totalSnow += period.snow['3h'] || 0;
                        hasSnow = true;
                    }
                });
                
                // Convert to inches (API returns in mm)
                totalSnow = (totalSnow / 25.4).toFixed(1);
                
                if (hasSnow && totalSnow >= settings.snowThreshold) {
                    alerts.push({
                        resort: resort.name,
                        snow: totalSnow,
                        temp: data.list[0].main.temp,
                        conditions: data.list[0].weather[0].description
                    });
                }
                
                // Weekend forecast
                const weekend = getNextWeekend();
                const weekendData = data.list.find(period => {
                    const periodDate = new Date(period.dt * 1000);
                    return periodDate.getDate() === weekend.getDate();
                });
                
                if (weekendData) {
                    forecasts.push({
                        resort: resort.name,
                        date: weekend,
                        temp: weekendData.main.temp,
                        conditions: weekendData.weather[0].description,
                        snow: weekendData.snow ? (weekendData.snow['3h'] / 25.4).toFixed(1) : 0
                    });
                }
            }
        } catch (error) {
            console.error(`Error fetching weather for ${resort.name}:`, error);
        }
    }
    
    // Cache the results
    const cacheData = {
        date: today,
        timestamp: Date.now(),
        data: { alerts, forecasts }
    };
    localStorage.setItem('weatherCache', JSON.stringify(cacheData));
    localStorage.setItem('weatherApiCalls', JSON.stringify(apiCalls));
    
    displayWeatherAlerts({ alerts, forecasts });
}

function displayWeatherAlerts(data = {}) {
    const { alerts = [], forecasts = [] } = data;
    
    // Display alerts
    const alertsHtml = alerts.length > 0 ? alerts.map(alert => `
        <div class="weather-alert">
            <div class="alert-header">
                <span class="alert-resort">${alert.resort}</span>
                <span class="alert-type">POWDER ALERT!</span>
            </div>
            <p>${alert.snow}" expected in next 48 hours</p>
            <p>Current: ${alert.temp.toFixed(0)}°F, ${alert.conditions}</p>
        </div>
    `).join('') : '<p>No powder alerts at this time.</p>';
    
    document.getElementById('alerts-list').innerHTML = alertsHtml;
    
    // Display weekend forecasts
    const forecastHtml = forecasts.length > 0 ? forecasts.map(forecast => `
        <div class="forecast-card">
            <div class="forecast-header">
                <h4>${forecast.resort}</h4>
                <span>${forecast.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            </div>
            <div class="forecast-details">
                <div class="forecast-item">
                    <span class="detail-label">Temp:</span> ${forecast.temp.toFixed(0)}°F
                </div>
                <div class="forecast-item">
                    <span class="detail-label">Conditions:</span> ${forecast.conditions}
                </div>
                ${forecast.snow > 0 ? `
                <div class="forecast-item">
                    <span class="detail-label">Snow:</span> ${forecast.snow}"
                </div>` : ''}
            </div>
        </div>
    `).join('') : '<p>No weekend forecast available.</p>';
    
    document.getElementById('weekend-forecast').innerHTML = forecastHtml;
}

function getNextWeekend() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
    const nextSaturday = new Date(today);
    nextSaturday.setDate(today.getDate() + daysUntilSaturday);
    return nextSaturday;
}

// Show feedback
function showFeedback(message) {
    const feedback = document.createElement('div');
    feedback.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--forest-green);
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    `;
    feedback.textContent = message;
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(feedback);
    
    setTimeout(() => {
        feedback.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => {
            feedback.remove();
            style.remove();
        }, 300);
    }, 3000);
}