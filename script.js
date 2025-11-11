// Initialize current user
let currentUser = 'aiden';

// Initialize ski days from localStorage or empty object for each user
let allSkiDays = JSON.parse(localStorage.getItem('allSkiDays')) || {
    aiden: [],
    jack: [],
    matt: [],
    mike: [],
    reece: []
};

// Get current user's ski days
function getCurrentUserDays() {
    return allSkiDays[currentUser] || [];
}

// DOM elements
const form = document.getElementById('ski-day-form');
const daysList = document.getElementById('days-list');
const totalDaysElement = document.getElementById('total-days');
const totalSnowElement = document.getElementById('total-snow');
const userSelect = document.getElementById('user-select');

// Load existing data on page load
document.addEventListener('DOMContentLoaded', () => {
    // Set initial user from select
    currentUser = userSelect.value;
    displaySkiDays();
    updateStats();
});

// Handle user change
userSelect.addEventListener('change', (e) => {
    currentUser = e.target.value;
    displaySkiDays();
    updateStats();
});

// Handle form submission
form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Get form data
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
    
    // Add to current user's array
    allSkiDays[currentUser].push(newSkiDay);
    
    // Sort by date (newest first)
    allSkiDays[currentUser].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Save to localStorage
    localStorage.setItem('allSkiDays', JSON.stringify(allSkiDays));
    
    // Update display
    displaySkiDays();
    updateStats();
    
    // Reset form
    form.reset();
    
    // Show success feedback
    showFeedback('Ski day added successfully!');
});

// Display all ski days
function displaySkiDays() {
    daysList.innerHTML = '';
    const currentDays = getCurrentUserDays();
    
    if (currentDays.length === 0) {
        daysList.innerHTML = `<p style="text-align: center; color: #1B5E20;">No ski days recorded yet for ${currentUser.charAt(0).toUpperCase() + currentUser.slice(1)}. Start tracking your adventures!</p>`;
        return;
    }
    
    currentDays.forEach(day => {
        const dayCard = createDayCard(day);
        daysList.appendChild(dayCard);
    });
}

// Create a ski day card
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

// Delete a ski day
function deleteSkiDay(id) {
    if (confirm('Are you sure you want to delete this ski day?')) {
        allSkiDays[currentUser] = allSkiDays[currentUser].filter(day => day.id !== id);
        localStorage.setItem('allSkiDays', JSON.stringify(allSkiDays));
        displaySkiDays();
        updateStats();
        showFeedback('Ski day deleted.');
    }
}

// Update statistics
function updateStats() {
    const currentDays = getCurrentUserDays();
    totalDaysElement.textContent = currentDays.length;
    
    const totalSnow = currentDays.reduce((sum, day) => sum + day.snowfall, 0);
    totalSnowElement.textContent = totalSnow.toFixed(1) + '"';
}

// Edit ski day functionality
const modal = document.getElementById('edit-modal');
const closeBtn = document.getElementsByClassName('close')[0];
const editForm = document.getElementById('edit-form');

// Open edit modal
function editSkiDay(id) {
    const currentDays = getCurrentUserDays();
    const day = currentDays.find(d => d.id === id);
    if (!day) return;
    
    // Populate form with existing data
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

// Close modal when clicking X
closeBtn.onclick = function() {
    modal.style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = 'none';
    }
}

// Handle edit form submission
editForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const id = parseInt(document.getElementById('edit-id').value);
    const dayIndex = allSkiDays[currentUser].findIndex(d => d.id === id);
    
    if (dayIndex === -1) return;
    
    // Update ski day
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
    
    // Sort by date (newest first)
    allSkiDays[currentUser].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Save to localStorage
    localStorage.setItem('allSkiDays', JSON.stringify(allSkiDays));
    
    // Update display
    displaySkiDays();
    updateStats();
    
    // Close modal
    modal.style.display = 'none';
    
    // Show success feedback
    showFeedback('Ski day updated successfully!');
});

// Show feedback message
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
    
    // Add animation
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
    
    // Remove after 3 seconds
    setTimeout(() => {
        feedback.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => {
            feedback.remove();
            style.remove();
        }, 300);
    }, 3000);
}