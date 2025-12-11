// This is the WORKING simple version with Firebase added carefully
let currentUser = 'aiden';
let allSkiDays = JSON.parse(localStorage.getItem('allSkiDays')) || {
    aiden: [],
    chris: [],
    jack: [],
    matt: [],
    mike: [],
    reece: []
};

function getCurrentUserDays() {
    return allSkiDays[currentUser] || [];
}

// DOM elements
const form = document.getElementById('ski-day-form');
const daysList = document.getElementById('days-list');
const totalDaysElement = document.getElementById('total-days');
const totalSnowElement = document.getElementById('total-snow');
const userSelect = document.getElementById('user-select');
const modal = document.getElementById('edit-modal');
const closeBtn = document.getElementsByClassName('close')[0];
const editForm = document.getElementById('edit-form');

// Tab switching
window.showTab = function(tab) {
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const tabIndex = {
        'add': 0,
        'view': 1,
        'stats': 2,
        'goals': 3,
        'pass': 4,
        'weather': 5
    };
    
    document.querySelectorAll('.tab-button')[tabIndex[tab]].classList.add('active');
    document.getElementById(tab + '-tab').classList.add('active');
    
    // Load content for specific tabs
    if (tab === 'stats') {
        updateStatsView();
    } else if (tab === 'goals') {
        loadGoalsAndBadges();
    } else if (tab === 'pass') {
        updatePassROI();
    } else if (tab === 'weather') {
        loadWeatherTab();
    }
}

// Make functions global so onclick works
window.editSkiDay = editSkiDay;
window.deleteSkiDay = deleteSkiDay;
window.updateStatsView = updateStatsView;
window.compareSkiers = compareSkiers;
window.loadWeatherTab = loadWeatherTab;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Ensure all users have arrays
    ['aiden', 'chris', 'jack', 'matt', 'mike', 'reece'].forEach(user => {
        if (!allSkiDays[user]) {
            allSkiDays[user] = [];
        }
    });
    
    currentUser = userSelect.value;
    displaySkiDays();
    updateStats();
    
    // Try to set up Firebase sync AFTER everything else is working
    setTimeout(setupFirebaseSync, 1000);
});

// Firebase sync - separate function so it doesn't break anything
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
                // Save to localStorage as backup
                localStorage.setItem('allSkiDays', JSON.stringify(allSkiDays));
                displaySkiDays();
                updateStats();
            }
        });
        
        // Listen for weather settings changes from Firebase
        db.ref('weatherSettings').on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                weatherSettings = data;
                localStorage.setItem('weatherSettings', JSON.stringify(weatherSettings));
                
                // Update UI if weather tab is open
                if (document.getElementById('weather-api-key')) {
                    document.getElementById('weather-api-key').value = weatherSettings.apiKey || '';
                    document.getElementById('enable-alerts').checked = weatherSettings.enableAlerts;
                    document.getElementById('snow-threshold').value = weatherSettings.snowThreshold || 6;
                    
                    // Update resort checkboxes
                    document.querySelectorAll('#resort-checkboxes input[type="checkbox"]').forEach(cb => {
                        cb.checked = weatherSettings.monitoredResorts && 
                                   weatherSettings.monitoredResorts.includes(cb.value);
                    });
                }
            }
        });
        
        console.log('Firebase sync enabled');
    } catch (error) {
        console.error('Firebase setup error:', error);
    }
}

// Save to Firebase (called after localStorage save)
function saveToFirebase() {
    if (typeof firebase === 'undefined') return;
    
    try {
        // Ensure all users exist before saving
        ['aiden', 'chris', 'jack', 'matt', 'mike', 'reece'].forEach(user => {
            if (!allSkiDays[user]) {
                allSkiDays[user] = [];
            }
        });
        
        firebase.database().ref('skiDays').set(allSkiDays);
    } catch (error) {
        console.error('Firebase save error:', error);
    }
}

// User change
userSelect.addEventListener('change', (e) => {
    currentUser = e.target.value;
    displaySkiDays();
    updateStats();
});

// Form submission
form.addEventListener('submit', (e) => {
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
    
    // Initialize array if it doesn't exist
    if (!allSkiDays[currentUser]) {
        allSkiDays[currentUser] = [];
    }
    
    allSkiDays[currentUser].push(newSkiDay);
    allSkiDays[currentUser].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Save to localStorage first (always works)
    localStorage.setItem('allSkiDays', JSON.stringify(allSkiDays));
    
    // Then try Firebase
    saveToFirebase();
    
    displaySkiDays();
    updateStats();
    form.reset();
    showTab('view');
    showFeedback('Ski day added!');
});

// Display ski days
function displaySkiDays() {
    daysList.innerHTML = '';
    const currentDays = getCurrentUserDays();
    
    if (currentDays.length === 0) {
        daysList.innerHTML = `<p style="text-align: center; color: #1B5E20; padding: 20px;">No ski days recorded yet for ${currentUser.charAt(0).toUpperCase() + currentUser.slice(1)}.</p>`;
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
    card.style.position = 'relative';
    
    // Parse date string as local date to avoid timezone issues
    const [year, month, day_num] = day.date.split('-');
    const localDate = new Date(year, month - 1, day_num);
    const formattedDate = localDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
    
    card.innerHTML = `
        <div class="card-buttons">
            <button class="edit-btn" onclick="editSkiDay(${day.id})">Edit</button>
            <button class="delete-btn" onclick="deleteSkiDay(${day.id})">Delete</button>
        </div>
        <h3>${day.resort} - ${formattedDate}</h3>
        <div class="day-details">
            <div class="detail-item">
                <span class="detail-label">Conditions:</span> ${day.conditions}
            </div>
            <div class="detail-item">
                <span class="detail-label">New Snow:</span> ${day.snowfall}" | 
                <span class="detail-label">Temp:</span> ${day.temperature}°F
            </div>
            ${day.weather ? `<div class="detail-item">
                <span class="detail-label">Weather:</span> ${day.weather}
            </div>` : ''}
            ${day.runs ? `<div class="detail-item">
                <span class="detail-label">Runs:</span> ${day.runs}
            </div>` : ''}
            ${day.notes ? `<div class="detail-item">
                <span class="detail-label">Notes:</span> ${day.notes}
            </div>` : ''}
        </div>
    `;
    
    return card;
}

// Delete ski day
function deleteSkiDay(id) {
    if (confirm('Delete this ski day?')) {
        allSkiDays[currentUser] = allSkiDays[currentUser].filter(day => day.id !== id);
        localStorage.setItem('allSkiDays', JSON.stringify(allSkiDays));
        saveToFirebase();
        displaySkiDays();
        updateStats();
        showFeedback('Deleted!');
    }
}

// Edit ski day
function editSkiDay(id) {
    const currentDays = getCurrentUserDays();
    const day = currentDays.find(d => d.id === id);
    if (!day) return;
    
    document.getElementById('edit-id').value = day.id;
    document.getElementById('edit-date').value = day.date;
    document.getElementById('edit-resort').value = day.resort;
    document.getElementById('edit-conditions').value = day.conditions;
    document.getElementById('edit-snowfall').value = day.snowfall;
    document.getElementById('edit-temperature').value = day.temperature;
    document.getElementById('edit-weather').value = day.weather;
    document.getElementById('edit-runs').value = day.runs || '';
    document.getElementById('edit-notes').value = day.notes || '';
    
    modal.style.display = 'block';
}

// Close modal
closeBtn.onclick = function() {
    modal.style.display = 'none';
}

window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = 'none';
    }
}

// Handle edit form
editForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const id = parseInt(document.getElementById('edit-id').value);
    const dayIndex = allSkiDays[currentUser].findIndex(d => d.id === id);
    
    if (dayIndex === -1) return;
    
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
    modal.style.display = 'none';
    showFeedback('Updated!');
});

// Update stats
function updateStats() {
    const currentDays = getCurrentUserDays();
    totalDaysElement.textContent = currentDays.length;
    
    const totalSnow = currentDays.reduce((sum, day) => sum + day.snowfall, 0);
    totalSnowElement.textContent = totalSnow.toFixed(1) + '"';
}

// Show feedback
function showFeedback(message) {
    const feedback = document.createElement('div');
    feedback.className = 'feedback';
    feedback.textContent = message;
    
    document.body.appendChild(feedback);
    
    setTimeout(() => {
        feedback.style.animation = 'slideDown 0.3s ease-out reverse';
        setTimeout(() => feedback.remove(), 300);
    }, 2000);
}

// Stats functionality (ALL THE SAME AS BEFORE)
function updateStatsView() {
    const statsView = document.getElementById('stats-view');
    if (!statsView) return;
    
    const view = statsView.value;
    
    switch(view) {
        case 'leaders':
            showLeaderboard();
            break;
        case 'mountains':
            showMountainStats();
            break;
        case 'extremes':
            showExtremeStats();
            break;
        case 'compare':
            showCompareSkiers();
            break;
    }
}

function showLeaderboard() {
    const content = document.getElementById('stats-content');
    const userStats = [];
    
    ['aiden', 'chris', 'jack', 'matt', 'mike', 'reece'].forEach(user => {
        const days = allSkiDays[user] || [];
        const totalSnow = days.reduce((sum, day) => sum + day.snowfall, 0);
        const powderDays = days.filter(day => day.conditions === 'Powder').length;
        
        userStats.push({
            name: user.charAt(0).toUpperCase() + user.slice(1),
            totalDays: days.length,
            totalSnow: totalSnow,
            powderDays: powderDays,
            avgSnow: days.length > 0 ? (totalSnow / days.length).toFixed(1) : 0
        });
    });
    
    userStats.sort((a, b) => b.totalDays - a.totalDays);
    
    content.innerHTML = `
        <div class="leaderboard">
            <h3>Season Leaders</h3>
            ${userStats.map((user, index) => `
                <div class="leader-card">
                    <div class="leader-rank">${index + 1}</div>
                    <div class="leader-info">
                        <h4>${user.name}</h4>
                        <div class="leader-stats">
                            <span>${user.totalDays} days</span>
                            <span>${user.totalSnow.toFixed(1)}" total</span>
                            <span>${user.powderDays} powder days</span>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function showMountainStats() {
    const content = document.getElementById('stats-content');
    const mountainCounts = {};
    
    Object.values(allSkiDays).forEach(userDays => {
        userDays.forEach(day => {
            const resort = day.resort;
            mountainCounts[resort] = (mountainCounts[resort] || 0) + 1;
        });
    });
    
    const sortedMountains = Object.entries(mountainCounts)
        .sort((a, b) => b[1] - a[1]);
    
    content.innerHTML = `
        <div class="mountain-stats">
            <h3>Most Visited Mountains</h3>
            ${sortedMountains.map(([mountain, count]) => `
                <div class="mountain-item">
                    <span class="mountain-name">${mountain}</span>
                    <span class="mountain-count">${count} visits</span>
                </div>
            `).join('')}
            ${sortedMountains.length === 0 ? '<p>No ski days recorded yet</p>' : ''}
        </div>
    `;
}

function showExtremeStats() {
    const content = document.getElementById('stats-content');
    let coldestDay = null;
    let deepestPowder = null;
    let mostRuns = null;
    
    Object.entries(allSkiDays).forEach(([user, days]) => {
        days.forEach(day => {
            if (day.temperature && (!coldestDay || parseInt(day.temperature) < parseInt(coldestDay.temperature))) {
                coldestDay = { ...day, user: user };
            }
            
            if (day.snowfall && (!deepestPowder || day.snowfall > deepestPowder.snowfall)) {
                deepestPowder = { ...day, user: user };
            }
            
            if (day.runs && (!mostRuns || day.runs.split(',').length > (mostRuns.runs?.split(',').length || 0))) {
                mostRuns = { ...day, user: user };
            }
        });
    });
    
    content.innerHTML = `
        <div class="extreme-stats">
            <h3>Extreme Days</h3>
            ${coldestDay ? `
                <div class="extreme-item">
                    <h4>Coldest Day</h4>
                    <p>${coldestDay.temperature}°F at ${coldestDay.resort}</p>
                    <p class="extreme-user">${coldestDay.user.charAt(0).toUpperCase() + coldestDay.user.slice(1)} on ${(() => {
                        const [year, month, day] = coldestDay.date.split('-');
                        return new Date(year, month - 1, day).toLocaleDateString();
                    })()}</p>
                </div>
            ` : ''}
            ${deepestPowder ? `
                <div class="extreme-item">
                    <h4>Deepest Powder</h4>
                    <p>${deepestPowder.snowfall}" at ${deepestPowder.resort}</p>
                    <p class="extreme-user">${deepestPowder.user.charAt(0).toUpperCase() + deepestPowder.user.slice(1)} on ${(() => {
                        const [year, month, day] = deepestPowder.date.split('-');
                        return new Date(year, month - 1, day).toLocaleDateString();
                    })()}</p>
                </div>
            ` : ''}
            ${!coldestDay && !deepestPowder ? '<p>No extreme days recorded yet</p>' : ''}
        </div>
    `;
}

function showCompareSkiers() {
    const content = document.getElementById('stats-content');
    
    content.innerHTML = `
        <div class="compare-skiers">
            <h3>Compare Skiers</h3>
            <div class="compare-selects">
                <select id="skier1" onchange="compareSkiers()">
                    <option value="">Select skier 1...</option>
                    <option value="aiden">Aiden</option>
                    <option value="chris">Chris</option>
                    <option value="jack">Jack</option>
                    <option value="matt">Matt</option>
                    <option value="mike">Mike</option>
                    <option value="reece">Reece</option>
                </select>
                <span>vs</span>
                <select id="skier2" onchange="compareSkiers()">
                    <option value="">Select skier 2...</option>
                    <option value="aiden">Aiden</option>
                    <option value="chris">Chris</option>
                    <option value="jack">Jack</option>
                    <option value="matt">Matt</option>
                    <option value="mike">Mike</option>
                    <option value="reece">Reece</option>
                </select>
            </div>
            <div id="comparison-result"></div>
        </div>
    `;
}

function compareSkiers() {
    const skier1 = document.getElementById('skier1').value;
    const skier2 = document.getElementById('skier2').value;
    const resultDiv = document.getElementById('comparison-result');
    
    if (!skier1 || !skier2 || skier1 === skier2) {
        resultDiv.innerHTML = '';
        return;
    }
    
    const days1 = allSkiDays[skier1] || [];
    const days2 = allSkiDays[skier2] || [];
    
    const stats1 = {
        name: skier1.charAt(0).toUpperCase() + skier1.slice(1),
        totalDays: days1.length,
        totalSnow: days1.reduce((sum, day) => sum + day.snowfall, 0),
        powderDays: days1.filter(day => day.conditions === 'Powder').length,
        resorts: [...new Set(days1.map(day => day.resort))].length
    };
    
    const stats2 = {
        name: skier2.charAt(0).toUpperCase() + skier2.slice(1),
        totalDays: days2.length,
        totalSnow: days2.reduce((sum, day) => sum + day.snowfall, 0),
        powderDays: days2.filter(day => day.conditions === 'Powder').length,
        resorts: [...new Set(days2.map(day => day.resort))].length
    };
    
    resultDiv.innerHTML = `
        <div class="comparison-grid">
            <div class="compare-stat">
                <span class="stat-label">Total Days</span>
                <div class="compare-values">
                    <span class="${stats1.totalDays > stats2.totalDays ? 'winner' : ''}">${stats1.name}: ${stats1.totalDays}</span>
                    <span class="${stats2.totalDays > stats1.totalDays ? 'winner' : ''}">${stats2.name}: ${stats2.totalDays}</span>
                </div>
            </div>
            <div class="compare-stat">
                <span class="stat-label">Total Snow</span>
                <div class="compare-values">
                    <span class="${stats1.totalSnow > stats2.totalSnow ? 'winner' : ''}">${stats1.name}: ${stats1.totalSnow.toFixed(1)}"</span>
                    <span class="${stats2.totalSnow > stats1.totalSnow ? 'winner' : ''}">${stats2.name}: ${stats2.totalSnow.toFixed(1)}"</span>
                </div>
            </div>
            <div class="compare-stat">
                <span class="stat-label">Powder Days</span>
                <div class="compare-values">
                    <span class="${stats1.powderDays > stats2.powderDays ? 'winner' : ''}">${stats1.name}: ${stats1.powderDays}</span>
                    <span class="${stats2.powderDays > stats1.powderDays ? 'winner' : ''}">${stats2.name}: ${stats2.powderDays}</span>
                </div>
            </div>
            <div class="compare-stat">
                <span class="stat-label">Different Resorts</span>
                <div class="compare-values">
                    <span class="${stats1.resorts > stats2.resorts ? 'winner' : ''}">${stats1.name}: ${stats1.resorts}</span>
                    <span class="${stats2.resorts > stats1.resorts ? 'winner' : ''}">${stats2.name}: ${stats2.resorts}</span>
                </div>
            </div>
        </div>
    `;
}

// Badge System
const badges = [
    { id: 'early_bird', name: 'Early Bird', description: 'First tracks before 9 AM', icon: '🌅', check: (days) => days.some(d => d.notes && d.notes.toLowerCase().includes('first tracks')) },
    { id: 'powder_hound', name: 'Powder Hound', description: '5 powder days', icon: '🏂', check: (days) => days.filter(d => d.conditions === 'Powder').length >= 5 },
    { id: 'storm_chaser', name: 'Storm Chaser', description: 'Ski in active snowfall', icon: '🌨️', check: (days) => days.some(d => d.weather === 'Snowing') },
    { id: 'die_hard', name: 'Die Hard', description: 'Ski below 0°F', icon: '🥶', check: (days) => days.some(d => parseInt(d.temperature) < 0) },
    { id: 'weekend_warrior', name: 'Weekend Warrior', description: '10 weekend days', icon: '📅', check: (days) => days.filter(d => { const dow = new Date(d.date).getDay(); return dow === 0 || dow === 6; }).length >= 10 },
    { id: 'bolton_local', name: 'Bolton Local', description: '20 days at Bolton', icon: '🏔️', check: (days) => days.filter(d => d.resort.toLowerCase().includes('bolton')).length >= 20 },
    { id: 'explorer', name: 'Mountain Explorer', description: '5 different resorts', icon: '🗺️', check: (days) => [...new Set(days.map(d => d.resort))].length >= 5 },
    { id: 'centurion', name: 'Centurion', description: '100 total days', icon: '💯', check: (days) => days.length >= 100 },
    { id: 'consistent', name: 'Consistent', description: '3 days in one week', icon: '📊', check: (days) => checkConsecutiveDays(days, 3, 7) },
    { id: 'dedicated', name: 'Dedicated', description: 'Ski every month Dec-Mar', icon: '🗓️', check: (days) => checkAllMonths(days) }
];

function checkConsecutiveDays(days, required, window) {
    const sorted = days.map(d => new Date(d.date)).sort((a, b) => a - b);
    for (let i = 0; i < sorted.length - required + 1; i++) {
        const diff = (sorted[i + required - 1] - sorted[i]) / (1000 * 60 * 60 * 24);
        if (diff < window) return true;
    }
    return false;
}

function checkAllMonths(days) {
    const months = days.map(d => new Date(d.date).getMonth());
    return [11, 0, 1, 2].every(m => months.includes(m)); // Dec, Jan, Feb, Mar
}

// Goals System
let userGoals = JSON.parse(localStorage.getItem('skiGoals')) || {};

window.showAddGoalForm = function() {
    const goalTypes = [
        { value: 'days', label: 'Total Days' },
        { value: 'powder', label: 'Powder Days' },
        { value: 'resorts', label: 'Different Resorts' },
        { value: 'bolton', label: 'Bolton Valley Days' }
    ];
    
    const form = `
        <div class="goal-form">
            <h3>Set New Goal</h3>
            <select id="goal-type">
                ${goalTypes.map(g => `<option value="${g.value}">${g.label}</option>`).join('')}
            </select>
            <input type="number" id="goal-target" placeholder="Target" min="1">
            <button onclick="addGoal()">Add Goal</button>
            <button onclick="loadGoalsAndBadges()">Cancel</button>
        </div>
    `;
    
    document.getElementById('goals-list').innerHTML = form;
}

window.addGoal = function() {
    const type = document.getElementById('goal-type').value;
    const target = parseInt(document.getElementById('goal-target').value);
    
    if (!target) return;
    
    if (!userGoals[currentUser]) {
        userGoals[currentUser] = [];
    }
    
    userGoals[currentUser].push({
        type: type,
        target: target,
        created: new Date().toISOString()
    });
    
    localStorage.setItem('skiGoals', JSON.stringify(userGoals));
    loadGoalsAndBadges();
}

window.loadGoalsAndBadges = function() {
    // Load goals
    const goals = userGoals[currentUser] || [];
    const currentDays = getCurrentUserDays();
    
    const goalsHTML = goals.map(goal => {
        let current = 0;
        switch(goal.type) {
            case 'days': current = currentDays.length; break;
            case 'powder': current = currentDays.filter(d => d.conditions === 'Powder').length; break;
            case 'resorts': current = [...new Set(currentDays.map(d => d.resort))].length; break;
            case 'bolton': current = currentDays.filter(d => d.resort.toLowerCase().includes('bolton')).length; break;
        }
        
        const progress = Math.min(100, (current / goal.target) * 100);
        const complete = current >= goal.target;
        
        return `
            <div class="goal-card ${complete ? 'complete' : ''}">
                <h4>${goal.type.charAt(0).toUpperCase() + goal.type.slice(1)} Goal</h4>
                <div class="goal-progress">
                    <div class="progress-bar" style="width: ${progress}%"></div>
                </div>
                <p>${current} / ${goal.target} ${complete ? '✅' : ''}</p>
            </div>
        `;
    }).join('');
    
    document.getElementById('goals-list').innerHTML = goalsHTML || '<p>No goals set yet!</p>';
    
    // Load badges
    const earnedBadges = badges.filter(badge => badge.check(currentDays));
    const badgesHTML = badges.map(badge => {
        const earned = earnedBadges.includes(badge);
        return `
            <div class="badge ${earned ? 'earned' : 'locked'}">
                <div class="badge-icon">${badge.icon}</div>
                <div class="badge-name">${badge.name}</div>
                <div class="badge-desc">${badge.description}</div>
            </div>
        `;
    }).join('');
    
    document.getElementById('badges-grid').innerHTML = badgesHTML;
}

// Season Pass ROI
window.updatePassROI = function() {
    const passPrice = parseFloat(document.getElementById('pass-price')?.value) || 599; // Bolton Valley typical price
    localStorage.setItem('passPrice', passPrice);
    
    // Calculate for all users
    const userStats = ['aiden', 'chris', 'jack', 'matt', 'mike', 'reece'].map(user => {
        const days = allSkiDays[user] || [];
        const boltonDays = days.filter(d => d.resort.toLowerCase().includes('bolton')).length;
        const costPerDay = boltonDays > 0 ? (passPrice / boltonDays).toFixed(2) : 'N/A';
        const breakEven = Math.ceil(passPrice / 89); // $89 is typical day ticket price
        
        return {
            name: user.charAt(0).toUpperCase() + user.slice(1),
            days: boltonDays,
            costPerDay: costPerDay,
            savings: boltonDays > 0 ? ((boltonDays * 89) - passPrice).toFixed(0) : 0
        };
    });
    
    const totalDays = userStats.reduce((sum, u) => sum + u.days, 0);
    const avgCostPerDay = totalDays > 0 ? (passPrice / totalDays).toFixed(2) : 'N/A';
    
    // Overall stats
    const statsHTML = `
        <div class="roi-summary">
            <div class="roi-stat">
                <h4>Total Bolton Days</h4>
                <p class="big-number">${totalDays}</p>
            </div>
            <div class="roi-stat">
                <h4>Cost Per Day</h4>
                <p class="big-number">$${avgCostPerDay}</p>
            </div>
            <div class="roi-stat">
                <h4>Break Even</h4>
                <p class="big-number">${Math.ceil(passPrice / 89)} days</p>
            </div>
        </div>
    `;
    
    document.getElementById('pass-stats').innerHTML = statsHTML;
    
    // Individual stats
    const userHTML = userStats.map(user => `
        <div class="user-roi-card">
            <h4>${user.name}</h4>
            <div class="roi-details">
                <span>${user.days} days</span>
                <span>$${user.costPerDay}/day</span>
                <span class="${parseInt(user.savings) > 0 ? 'savings' : 'loss'}">
                    ${parseInt(user.savings) > 0 ? '+' : ''}$${user.savings}
                </span>
            </div>
        </div>
    `).join('');
    
    document.getElementById('user-pass-stats').innerHTML = userHTML;
    
    // Load saved price on init
    const savedPrice = localStorage.getItem('passPrice');
    if (savedPrice && document.getElementById('pass-price')) {
        document.getElementById('pass-price').value = savedPrice;
    }
}

// Weather Alert System
const newEnglandResorts = [
    // Vermont - Your local mountains
    { name: 'Bolton Valley', lat: 44.4217, lon: -72.8497 },
    { name: 'Stowe', lat: 44.5303, lon: -72.7814 },
    { name: 'Jay Peak', lat: 44.9379, lon: -72.5045 },
    { name: 'Killington', lat: 43.6775, lon: -72.7933 },
    { name: 'Sugarbush', lat: 44.1359, lon: -72.9056 },
    { name: 'Mad River Glen', lat: 44.2025, lon: -72.9178 },
    { name: 'Smugglers Notch', lat: 44.5894, lon: -72.7765 },
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

let weatherSettings = JSON.parse(localStorage.getItem('weatherSettings')) || {
    apiKey: '',
    enableAlerts: true,
    snowThreshold: 6,
    monitoredResorts: newEnglandResorts.map(r => r.name) // Monitor all New England resorts by default
};

let weatherCache = {};
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour
let dailyApiCalls = parseInt(localStorage.getItem('dailyApiCalls')) || 0;
const MAX_DAILY_CALLS = 900;

// Reset API call count daily
const lastReset = localStorage.getItem('apiCallResetDate');
const today = new Date().toDateString();
if (lastReset !== today) {
    dailyApiCalls = 0;
    localStorage.setItem('apiCallResetDate', today);
    localStorage.setItem('dailyApiCalls', '0');
}

window.saveWeatherSettings = function() {
    const apiKey = document.getElementById('weather-api-key').value;
    if (apiKey) {
        weatherSettings.apiKey = apiKey;
        weatherSettings.enableAlerts = document.getElementById('enable-alerts').checked;
        weatherSettings.snowThreshold = parseInt(document.getElementById('snow-threshold').value) || 6;
        
        // Get monitored resorts
        weatherSettings.monitoredResorts = [];
        document.querySelectorAll('#resort-checkboxes input[type="checkbox"]:checked').forEach(cb => {
            weatherSettings.monitoredResorts.push(cb.value);
        });
        
        localStorage.setItem('weatherSettings', JSON.stringify(weatherSettings));
        
        // Save to Firebase so everyone can use the same API key
        if (typeof firebase !== 'undefined') {
            try {
                firebase.database().ref('weatherSettings').set(weatherSettings);
            } catch (error) {
                console.error('Error saving weather settings to Firebase:', error);
            }
        }
        
        showFeedback('Weather settings saved for everyone!');
        checkWeatherAlerts();
    } else {
        showFeedback('Please enter API key');
    }
}

function loadWeatherTab() {
    console.log('Loading weather tab...');
    
    // Load saved settings
    const apiKeyEl = document.getElementById('weather-api-key');
    const enableAlertsEl = document.getElementById('enable-alerts');
    const snowThresholdEl = document.getElementById('snow-threshold');
    const checkboxContainer = document.getElementById('resort-checkboxes');
    
    if (apiKeyEl && weatherSettings.apiKey) {
        apiKeyEl.value = weatherSettings.apiKey;
    }
    
    if (enableAlertsEl) {
        enableAlertsEl.checked = weatherSettings.enableAlerts;
        console.log('Set enable alerts to:', weatherSettings.enableAlerts);
    } else {
        console.error('Enable alerts element not found');
    }
    
    if (snowThresholdEl) {
        snowThresholdEl.value = weatherSettings.snowThreshold;
    }
    
    // Checkboxes are now in HTML, just update their state based on saved settings
    if (checkboxContainer) {
        const checkboxes = checkboxContainer.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => {
            cb.checked = weatherSettings.monitoredResorts.includes(cb.value);
        });
        console.log('Updated checkbox states for saved settings');
    }
    
    // Check for alerts if API key exists
    if (weatherSettings.apiKey && weatherSettings.enableAlerts) {
        console.log('Starting weather check...');
        checkWeatherAlerts();
    } else {
        const alertsList = document.getElementById('alerts-list');
        if (alertsList) {
            if (!weatherSettings.apiKey) {
                alertsList.innerHTML = '<p>Enter your API key to see weather alerts</p>';
            } else if (!weatherSettings.enableAlerts) {
                alertsList.innerHTML = '<p>Enable weather alerts to see forecasts</p>';
            }
        }
    }
}

async function checkWeatherAlerts() {
    console.log('Checking weather alerts...');
    console.log('API Key exists:', !!weatherSettings.apiKey);
    console.log('Alerts enabled:', weatherSettings.enableAlerts);
    
    if (!weatherSettings.apiKey || !weatherSettings.enableAlerts) {
        document.getElementById('alerts-list').innerHTML = '<p>Enter API key and enable alerts to see weather data</p>';
        return;
    }
    
    if (dailyApiCalls >= MAX_DAILY_CALLS) {
        console.log('API call limit reached for today');
        displayCachedAlerts();
        return;
    }
    
    const alerts = [];
    const forecasts = [];
    
    console.log('Monitoring', weatherSettings.monitoredResorts.length, 'resorts');
    
    for (const resortName of weatherSettings.monitoredResorts) {
        const resort = newEnglandResorts.find(r => r.name === resortName);
        if (!resort) {
            console.log('Resort not found in data:', resortName);
            continue;
        }
        
        console.log('Checking weather for', resort.name);
        
        // Check cache first
        const cacheKey = `${resort.name}_${new Date().toDateString()}`;
        if (weatherCache[cacheKey] && Date.now() - weatherCache[cacheKey].timestamp < CACHE_DURATION) {
            processWeatherData(resort, weatherCache[cacheKey].data, alerts, forecasts);
            continue;
        }
        
        try {
            // Fetch 5-day forecast
            const response = await fetch(
                `https://api.openweathermap.org/data/2.5/forecast?lat=${resort.lat}&lon=${resort.lon}&appid=${weatherSettings.apiKey}&units=imperial`
            );
            
            if (response.ok) {
                const data = await response.json();
                
                // Cache the data
                weatherCache[cacheKey] = {
                    data: data,
                    timestamp: Date.now()
                };
                
                // Update API call count
                dailyApiCalls++;
                localStorage.setItem('dailyApiCalls', dailyApiCalls.toString());
                
                processWeatherData(resort, data, alerts, forecasts);
            }
        } catch (error) {
            console.error('Weather API error:', error);
        }
    }
    
    // Save alerts to cache
    localStorage.setItem('lastWeatherAlerts', JSON.stringify({ alerts, forecasts, timestamp: Date.now() }));
    
    displayAlerts(alerts);
    displayWeekendForecast(forecasts);
}

function processWeatherData(resort, data, alerts, forecasts) {
    let totalSnow = 0;
    let snowPeriods = 0;
    
    console.log(`Processing weather data for ${resort.name}...`);
    
    // Check next 48 hours for snow
    for (let i = 0; i < Math.min(16, data.list.length); i++) { // 16 * 3 hours = 48 hours
        const forecast = data.list[i];
        const time = new Date(forecast.dt * 1000).toLocaleString();
        const weather = forecast.weather[0].main;
        const description = forecast.weather[0].description;
        
        if (i < 3) { // Log first few periods
            console.log(`  ${time}: ${weather} - ${description}`);
        }
        
        // Check both actual snow data and weather descriptions
        let periodSnow = 0;
        
        if (forecast.snow && forecast.snow['3h']) {
            // API provides snow accumulation data
            periodSnow = forecast.snow['3h'] / 25.4; // Convert mm to inches
            if (i < 3) {
                console.log(`    ❄️ API Snow: ${forecast.snow['3h']}mm (${periodSnow.toFixed(1)}")`);
            }
        } else if (weather === 'Snow' || description.toLowerCase().includes('snow')) {
            // Snow mentioned but no accumulation data - estimate light snow
            const snowKeywords = ['light snow', 'snow showers', 'snow'];
            if (snowKeywords.some(keyword => description.toLowerCase().includes(keyword))) {
                periodSnow = 0.5; // Estimate 0.5" for light snow periods
                if (i < 3) {
                    console.log(`    ❄️ Estimated Snow (${description}): ${periodSnow}"`);
                }
            }
        }
        
        if (periodSnow > 0) {
            totalSnow += periodSnow;
            snowPeriods++;
        }
    }
    
    console.log(`${resort.name} - Total snow forecast: ${totalSnow.toFixed(1)}" over ${snowPeriods} periods (threshold: ${weatherSettings.snowThreshold}")`);
    
    if (totalSnow >= weatherSettings.snowThreshold) {
        alerts.push({
            resort: resort.name,
            type: 'snow',
            amount: totalSnow.toFixed(1),
            message: `${resort.name} expecting ${totalSnow.toFixed(1)}" of snow in next 48 hours!`
        });
        console.log(`🚨 POWDER ALERT: ${resort.name}!`);
    } else if (totalSnow > 0) {
        console.log(`❄️ Some snow forecast for ${resort.name} but below threshold`);
    } else {
        console.log(`No snow forecast for ${resort.name}`);
    }
    
    // Get weekend forecast
    const friday = getNextWeekday(5);
    const sunday = getNextWeekday(0);
    
    const weekendForecasts = data.list.filter(item => {
        const date = new Date(item.dt * 1000);
        return date >= friday && date <= sunday;
    });
    
    if (weekendForecasts.length > 0) {
        const avgTemp = weekendForecasts.reduce((sum, f) => sum + f.main.temp, 0) / weekendForecasts.length;
        const totalWeekendSnow = weekendForecasts.reduce((sum, f) => {
            return sum + (f.snow && f.snow['3h'] ? f.snow['3h'] / 25.4 : 0);
        }, 0);
        
        forecasts.push({
            resort: resort.name,
            avgTemp: Math.round(avgTemp),
            snowfall: Math.round(totalWeekendSnow * 10) / 10,
            conditions: weekendForecasts[0].weather[0].main
        });
    }
}

function getNextWeekday(dayOfWeek) {
    const today = new Date();
    const currentDay = today.getDay();
    const daysUntil = (dayOfWeek - currentDay + 7) % 7 || 7;
    const nextDay = new Date(today);
    nextDay.setDate(today.getDate() + daysUntil);
    nextDay.setHours(0, 0, 0, 0);
    return nextDay;
}

function displayAlerts(alerts) {
    const container = document.getElementById('alerts-list');
    if (alerts.length === 0) {
        container.innerHTML = '<p>No snow alerts at monitored resorts</p>';
        return;
    }
    
    container.innerHTML = alerts.map(alert => `
        <div class="weather-alert ${alert.type}">
            <h4>${alert.resort}</h4>
            <p>${alert.message}</p>
        </div>
    `).join('');
}

function displayWeekendForecast(forecasts) {
    const container = document.getElementById('weekend-forecast');
    if (forecasts.length === 0) {
        container.innerHTML = '<p>No weekend forecast available</p>';
        return;
    }
    
    container.innerHTML = forecasts.map(f => `
        <div class="weekend-forecast-card">
            <h4>${f.resort}</h4>
            <div class="forecast-details">
                <span>Avg: ${f.avgTemp}°F</span>
                <span>Snow: ${f.snowfall}"</span>
                <span>${f.conditions}</span>
            </div>
        </div>
    `).join('');
}

function displayCachedAlerts() {
    const cached = localStorage.getItem('lastWeatherAlerts');
    if (cached) {
        const { alerts, forecasts } = JSON.parse(cached);
        displayAlerts(alerts);
        displayWeekendForecast(forecasts);
        document.getElementById('alerts-list').innerHTML += '<p class="cache-notice">Using cached data (API limit reached)</p>';
    }
}

// Check weather every hour if tab is open
setInterval(() => {
    if (document.getElementById('weather-tab').classList.contains('active')) {
        checkWeatherAlerts();
    }
}, 60 * 60 * 1000);