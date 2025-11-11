// This is the WORKING simple version with Firebase added carefully
let currentUser = 'aiden';
let allSkiDays = JSON.parse(localStorage.getItem('allSkiDays')) || {
    aiden: [],
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
    
    if (tab === 'add') {
        document.querySelectorAll('.tab-button')[0].classList.add('active');
        document.getElementById('add-tab').classList.add('active');
    } else if (tab === 'view') {
        document.querySelectorAll('.tab-button')[1].classList.add('active');
        document.getElementById('view-tab').classList.add('active');
    } else if (tab === 'stats') {
        document.querySelectorAll('.tab-button')[2].classList.add('active');
        document.getElementById('stats-tab').classList.add('active');
        updateStatsView();
    }
}

// Make functions global so onclick works
window.editSkiDay = editSkiDay;
window.deleteSkiDay = deleteSkiDay;
window.updateStatsView = updateStatsView;
window.compareSkiers = compareSkiers;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Ensure all users have arrays
    ['aiden', 'jack', 'matt', 'mike', 'reece'].forEach(user => {
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
        ['aiden', 'jack', 'matt', 'mike', 'reece'].forEach(user => {
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
    
    const formattedDate = new Date(day.date).toLocaleDateString('en-US', {
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
    
    ['aiden', 'jack', 'matt', 'mike', 'reece'].forEach(user => {
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
                    <p class="extreme-user">${coldestDay.user.charAt(0).toUpperCase() + coldestDay.user.slice(1)} on ${new Date(coldestDay.date).toLocaleDateString()}</p>
                </div>
            ` : ''}
            ${deepestPowder ? `
                <div class="extreme-item">
                    <h4>Deepest Powder</h4>
                    <p>${deepestPowder.snowfall}" at ${deepestPowder.resort}</p>
                    <p class="extreme-user">${deepestPowder.user.charAt(0).toUpperCase() + deepestPowder.user.slice(1)} on ${new Date(deepestPowder.date).toLocaleDateString()}</p>
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
                    <option value="jack">Jack</option>
                    <option value="matt">Matt</option>
                    <option value="mike">Mike</option>
                    <option value="reece">Reece</option>
                </select>
                <span>vs</span>
                <select id="skier2" onchange="compareSkiers()">
                    <option value="">Select skier 2...</option>
                    <option value="aiden">Aiden</option>
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