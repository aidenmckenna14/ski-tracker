// Mobile version with shared localStorage
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
function showTab(tab) {
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    if (tab === 'add') {
        document.querySelectorAll('.tab-button')[0].classList.add('active');
        document.getElementById('add-tab').classList.add('active');
    } else {
        document.querySelectorAll('.tab-button')[1].classList.add('active');
        document.getElementById('view-tab').classList.add('active');
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    currentUser = userSelect.value;
    displaySkiDays();
    updateStats();
});

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
    
    allSkiDays[currentUser].push(newSkiDay);
    allSkiDays[currentUser].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    localStorage.setItem('allSkiDays', JSON.stringify(allSkiDays));
    
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