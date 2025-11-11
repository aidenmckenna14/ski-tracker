// Desktop version with Firebase sync
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
    
    // Set up Firebase sync after everything loads
    setTimeout(setupFirebaseSync, 1000);
});

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
    
    // Save to localStorage first
    localStorage.setItem('allSkiDays', JSON.stringify(allSkiDays));
    
    // Then Firebase
    saveToFirebase();
    
    displaySkiDays();
    updateStats();
    form.reset();
    showFeedback('Ski day added!');
});

// Display ski days
function displaySkiDays() {
    daysList.innerHTML = '';
    const currentDays = getCurrentUserDays();
    
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

// Delete function (needs to be global for onclick)
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
    const currentDays = getCurrentUserDays();
    totalDaysElement.textContent = currentDays.length;
    
    const totalSnow = currentDays.reduce((sum, day) => sum + day.snowfall, 0);
    totalSnowElement.textContent = totalSnow.toFixed(1) + '"';
}

// Show feedback
function showFeedback(message) {
    const feedback = document.createElement('div');
    feedback.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #1B5E20;
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