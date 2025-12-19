let cards = [];
let currentColumn = '';
let editingCardId = null;
let deletingCardId = null;
let selectedTags = [];
let activeFilters = [];
// Canvas
let scale = 1;
let panX = 0;
let panY = 0;
let isPanning = false;
let startX = 0;
let startY = 0;
const minScale = 0.5;
const maxScale = 2.0;


function initializeForFirstTimeUser() {
    const hasUsedBefore = localStorage.getItem('kanbanInitialized');

    if (!hasUsedBefore) {
        localStorage.clear();
        cards = [];

        localStorage.setItem('kanbanInitialized', 'true');

        console.log("Welcome to Sift");
    }
}

function loadSubtitle() {
    const saved = localStorage.getItem('kanbanSubtitle');
    if (saved) {
        document.getElementById('subtitle').textContent = saved;
    }
}

function saveSubtitle(text) {
    localStorage.setItem('kanbanSubtitle', text);
}

function loadCards() {
    const saved = localStorage.getItem('kanbanCards');
    if (saved) {
        cards = JSON.parse(saved);
    } else {
        cards = [];
    }
    renderAllCards();
}




// ----------- Display App Version  -----------
async function displayVersion() {
    try {
        const version = await window.electronAPI.getAppVersion();
        document.getElementById('versionInfo').textContent = `Sift v${version}`;
    } catch (err) {
        console.error('Error fetching app version:', err);
        document.getElementById('versionInfo').textContent = 'v?';
    }
}
// --------------------------------------------


const canvasWrapper = document.getElementById('canvasWrapper');
const canvasContent = document.getElementById('canvasContent');
const controlHint = document.getElementById('control-hint');

function updateTransform() {
    canvasContent.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
    document.getElementById('zoomLevel').textContent = Math.round(scale * 100) + '%';
}

// Mouse wheel zoom
canvasWrapper.addEventListener('wheel', (e) => {
    e.preventDefault();

    const rect = canvasWrapper.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(Math.max(scale * delta, minScale), maxScale);

    // Zoom towards mouse position
    const scaleChange = newScale / scale;
    panX = mouseX - (mouseX - panX) * scaleChange;
    panY = mouseY - (mouseY - panY) * scaleChange;

    scale = newScale;
    updateTransform();
});

// Middle mouse button pan
canvasWrapper.addEventListener('mousedown', (e) => {
    if (e.button === 1) { // Middle mouse button
        e.preventDefault();
        isPanning = true;
        startX = e.clientX - panX;
        startY = e.clientY - panY;
        canvasWrapper.classList.add('panning');
    }
});

canvasWrapper.addEventListener('mousemove', (e) => {
    if (isPanning) {
        panX = e.clientX - startX;
        panY = e.clientY - startY;
        updateTransform();
    }
});

canvasWrapper.addEventListener('mouseup', (e) => {
    if (e.button === 1) {
        isPanning = false;
        canvasWrapper.classList.remove('panning');
    }
});

canvasWrapper.addEventListener('mouseleave', () => {
    if (isPanning) {
        isPanning = false;
        canvasWrapper.classList.remove('panning');
    }
});

// Zoom controls
document.getElementById('zoomIn').addEventListener('click', () => {
    scale = Math.min(scale * 1.2, maxScale);
    updateTransform();
});

document.getElementById('zoomOut').addEventListener('click', () => {
    scale = Math.max(scale * 0.8, minScale);
    updateTransform();
});

document.getElementById('resetZoom').addEventListener('click', () => {
    scale = 1;
    panX = 0;
    panY = 0;
    updateTransform();
});

// Prevent middle mouse default behavior (scrolling)
document.addEventListener('mousedown', (e) => {
    if (e.button === 1) {
        e.preventDefault();
        return false;
    }
});



function saveCards() {
    localStorage.setItem('kanbanCards', JSON.stringify(cards));
}

function updateProgressBar() {
    const totalCards = cards.length;
    const doneCards = cards.filter(c => c.column === 'done').length;

    if (totalCards === 0) {
        document.getElementById('progressFill').style.width = '0%';
        document.getElementById('progressPercentage').textContent = '0%';
        return;
    }

    const percentage = Math.round((doneCards / totalCards) * 100);
    document.getElementById('progressFill').style.width = percentage + '%';
    document.getElementById('progressPercentage').textContent = percentage + '%';
}

function renderAllCards() {

    document.querySelectorAll('.cards').forEach(container => {
        container.innerHTML = '';
    });

    cards.forEach(card => {
        createCardElement(card);
    });

    updateCardCounts();
    updateStats();
    updateProgressBar();
}

function createCardElement(card) {
    const container = document.querySelector(`.cards[data-column="${card.column}"]`);
    const cardEl = document.createElement('div');
    cardEl.className = 'card';
    cardEl.draggable = true;
    cardEl.dataset.id = card.id;

    const createdDate = new Date(card.createdAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });

    let timestampText = `Created: ${createdDate}`;

    if (card.editedAt) {
        const editedDate = new Date(card.editedAt).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
        timestampText = `Edited: ${editedDate}`;
    }

    let tagsHTML = '';
    if (card.tags && card.tags.length > 0) {
        tagsHTML = '<div class="card-tags">';
        card.tags.forEach(tag => {
            tagsHTML += `<span class="card-tag tag-${tag}">${tag}</span>`;
        });
        tagsHTML += '</div>';
    }

    cardEl.innerHTML = `
                <div class="card-timestamp">${timestampText}</div>
                ${tagsHTML}
                <div class="card-content">${card.text}</div>
                <div class="card-footer">
                    <span class="card-priority priority-${card.priority}">${card.priority.toUpperCase()}</span>
                    <div class="card-actions">
                        <button class="btn btn-edit" onclick="editCard(${card.id})">Edit</button>
                        <button class="btn btn-delete" onclick="deleteCard(${card.id})">Delete</button>
                    </div>
                </div>
            `;

    cardEl.addEventListener('dragstart', handleDragStart);
    cardEl.addEventListener('dragend', handleDragEnd);

    container.appendChild(cardEl);
}

function handleDragStart(e) {
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.dataset.id);
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.cards').forEach(c => c.classList.remove('drag-over'));
}

document.querySelectorAll('.cards').forEach(container => {
    container.addEventListener('dragover', e => {
        e.preventDefault();
        container.classList.add('drag-over');
    });

    container.addEventListener('dragleave', e => {
        container.classList.remove('drag-over');
    });

    container.addEventListener('drop', e => {
        e.preventDefault();
        container.classList.remove('drag-over');

        const cardId = parseInt(e.dataTransfer.getData('text/html'));
        const newColumn = container.dataset.column;

        const card = cards.find(c => c.id === cardId);
        if (card) {
            const oldColumn = card.column;
            card.column = newColumn;
            saveCards();
            renderAllCards();

            // Confetti when moved to Done!
            if (newColumn === 'done' && oldColumn !== 'done') {
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#f582ae', '#72ddf7', '#ffd803', '#8bd3dd']
                });
            }
        }
    });
});

function openModal(column) {
    currentColumn = column;
    editingCardId = null;
    selectedTags = [];
    document.getElementById('modalTitle').textContent = 'Add New Card';
    document.getElementById('cardText').value = '';
    document.querySelector('input[name="cardPriority"][value="medium"]').checked = true;
    document.querySelectorAll('.tag-option').forEach(opt => {
        opt.classList.remove('selected', 'unselected');
    });
    document.getElementById('cardModal').classList.add('active');
    document.getElementById('cardText').focus();
}

function closeModal() {
    document.getElementById('cardModal').classList.remove('active');
}

function editCard(id) {
    const card = cards.find(c => c.id === id);
    if (card) {
        editingCardId = id;
        currentColumn = card.column;
        selectedTags = card.tags || [];
        document.getElementById('modalTitle').textContent = 'Edit Card';
        document.getElementById('cardText').value = card.text;
        document.querySelector(`input[name="cardPriority"][value="${card.priority}"]`).checked = true;

        // Update tag selection UI
        document.querySelectorAll('.tag-option').forEach(opt => {
            const tag = opt.dataset.tag;
            if (selectedTags.includes(tag)) {
                opt.classList.add('selected');
                opt.classList.remove('unselected');
            } else {
                opt.classList.remove('selected');
                opt.classList.add('unselected');
            }
        });

        document.getElementById('cardModal').classList.add('active');
        document.getElementById('cardText').focus();
    }
}

function deleteCard(id) {
    deletingCardId = id;
    document.getElementById('confirmModal').classList.add('active');
}

function closeConfirmModal() {
    document.getElementById('confirmModal').classList.remove('active');
    deletingCardId = null;
}

function confirmDelete() {
    if (deletingCardId) {
        cards = cards.filter(c => c.id !== deletingCardId);
        saveCards();
        renderAllCards();
        updateStats();
        closeConfirmModal();
    }
}

function updateCardCounts() {
    document.querySelectorAll('.column').forEach(column => {
        const columnName = column.dataset.column;
        const count = cards.filter(c => c.column === columnName).length;
        column.querySelector('.card-count').textContent = count;
    });
}

function applyFilters() {
    const searchTerm = document.getElementById('searchBox').value.toLowerCase();

    document.querySelectorAll('.card').forEach(cardEl => {
        const cardId = parseInt(cardEl.dataset.id);
        const card = cards.find(c => c.id === cardId);

        if (!card) return;

        let matchesSearch = true;
        let matchesTagFilter = true;

        // Search filter
        if (searchTerm) {
            matchesSearch = card.text.toLowerCase().includes(searchTerm);
        }

        // Tag filter
        if (activeFilters.length > 0) {
            matchesTagFilter = card.tags && card.tags.some(tag => activeFilters.includes(tag));
        }

        if (matchesSearch && matchesTagFilter) {
            cardEl.classList.remove('hidden');
        } else {
            cardEl.classList.add('hidden');
        }
    });
}

/* FUNCTION: Sort Columnn 
function sortColumn(columnName) {
    const columnCards = cards.filter(c => c.column === columnName);
    const priorityOrder = { high: 0, medium: 1, low: 2 };

    columnCards.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    // Update cards array
    cards = cards.filter(c => c.column !== columnName).concat(columnCards);
    saveCards();
    renderAllCards();
}
*/

// Updating Stats
function updateStats() {
    const total = cards.length;
    const done = cards.filter(c => c.column === 'done').length;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;

    const statsEl = document.getElementById('stats');

    if (statsEl) {
        statsEl.textContent = `(${total} cards, ${percent}% done)`;
    }
}




document.getElementById('cardForm').addEventListener('submit', e => {
    e.preventDefault();

    const text = document.getElementById('cardText').value.trim();
    const priority = document.querySelector('input[name="cardPriority"]:checked').value;

    if (editingCardId) {
        const card = cards.find(c => c.id === editingCardId);
        if (card) {
            card.text = text;
            card.priority = priority;
            card.tags = selectedTags;
            card.editedAt = Date.now();
        }
    } else {
        cards.push({
            id: Date.now(),
            text,
            priority,
            tags: selectedTags,
            column: currentColumn,
            createdAt: Date.now(),
            editedAt: null
        });
    }

    saveCards();
    renderAllCards();
    closeModal();
});

document.getElementById('cardModal').addEventListener('click', e => {
    if (e.target.id === 'cardModal') {
        closeModal();
    }
});

document.getElementById('confirmModal').addEventListener('click', e => {
    if (e.target.id === 'confirmModal') {
        closeConfirmModal();
    }
});

// Tag selection
document.querySelectorAll('.tag-option').forEach(option => {
    option.addEventListener('click', function () {
        const tag = this.dataset.tag;

        if (selectedTags.includes(tag)) {
            selectedTags = selectedTags.filter(t => t !== tag);
            this.classList.remove('selected');
        } else {
            selectedTags.push(tag);
            this.classList.add('selected');
        }

        // Update visual state
        document.querySelectorAll('.tag-option').forEach(opt => {
            if (!opt.classList.contains('selected')) {
                opt.classList.add('unselected');
            } else {
                opt.classList.remove('unselected');
            }
        });

        // If nothing selected, remove unselected class from all
        if (selectedTags.length === 0) {
            document.querySelectorAll('.tag-option').forEach(opt => {
                opt.classList.remove('unselected');
            });
        }
    });
});

// Search functionality
document.getElementById('searchBox').addEventListener('input', applyFilters);

// Filter buttons
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function () {
        const filter = this.dataset.filter;

        if (activeFilters.includes(filter)) {
            activeFilters = activeFilters.filter(f => f !== filter);
            this.classList.remove('active');
        } else {
            activeFilters.push(filter);
            this.classList.add('active');
        }

        applyFilters();
    });
});

document.getElementById('clearFilters').addEventListener('click', () => {
    activeFilters = [];
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('searchBox').value = '';
    applyFilters();
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Don't trigger if typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.contentEditable === 'true') {
        if (e.key === 'Escape') {
            closeModal();
            closeConfirmModal();
            e.target.blur();
        }
        return;
    }

    // / - Focus search
    if (e.key === 'tab') {
        e.preventDefault();
        document.getElementById('searchBox').focus();
    }

    // n - Add new card to backlog
    if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        openModal('backlog');
    }

    if (e.key === '.') {
        e.preventDefault();
        scale = 1;
        panX = 0;
        panY = 0;
        updateTransform();
    }

    // ? - Toggle keyboard shortcuts help
    if (e.key === '?' || e.key === '/') {
        e.preventDefault();
        const shortcuts = document.getElementById('shortcuts');
        shortcuts.classList.toggle('hide');
    }

    // ESC - Close modals and shortcuts
    if (e.key === 'Escape') {
        closeModal();
        closeConfirmModal();
        document.getElementById('shortcuts').classList.add('hide');
    }
});

const subtitle = document.getElementById('subtitle');

subtitle.addEventListener('click', () => {
    subtitle.contentEditable = 'true';
    subtitle.classList.add('editing');
    subtitle.focus();

    // Select all text
    const range = document.createRange();
    range.selectNodeContents(subtitle);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
});

subtitle.addEventListener('blur', () => {
    subtitle.contentEditable = 'false';
    subtitle.classList.remove('editing');
    saveSubtitle(subtitle.textContent.trim());
});

subtitle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        subtitle.blur();
    }
});


document.addEventListener('DOMContentLoaded', () => {

    const messageElement = document.getElementById('control-hint');
    if (!messageElement) return;

    // --- Configuration ---
    const delayBeforeFade = 9000; // 9 seconds delay before starting the fade
    const fadeDuration = 3000; // 3 second fade duration (must match CSS transition time)
    // ---------------------

    // 1. Wait for the delay
    setTimeout(() => {
        // Start the fade out by adding the CSS class
        messageElement.classList.add('welcome-fade');

        // 2. Wait for the fade animation to finish
        messageElement.addEventListener('transitionend', function handler() {

            // Remove the element from the DOM (makes it truly disappear, not just invisible)
            messageElement.remove();

            // Remove the event listener to prevent it from firing again
            messageElement.removeEventListener('transitionend', handler);

        });
    }, delayBeforeFade);

    displayVersion();

});

document.getElementById('exportBtn').addEventListener('click', function () {
    const button = this;
    const originalText = button.textContent;
    button.textContent = 'Generating...';
    button.disabled = true;

    const container = document.querySelector('.container');

    html2canvas(container, {
        backgroundColor: '#fef6e4',
        scale: 2,
        logging: false
    }).then(canvas => {
        const padding = 60;
        const newCanvas = document.createElement('canvas');
        newCanvas.width = canvas.width + (padding * 2);
        newCanvas.height = canvas.height + (padding * 2);

        const ctx = newCanvas.getContext('2d');
        ctx.fillStyle = '#fef6e4';
        ctx.fillRect(0, 0, newCanvas.width, newCanvas.height);
        ctx.drawImage(canvas, padding, padding);

        newCanvas.toBlob((blob) => {
            const now = new Date();

            // YYYY-MM-DD format (e.g., 2025-12-13)
            const year = now.getFullYear();
            // Month is 0-indexed, so add 1 and pad
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            const day = now.getDate().toString().padStart(2, '0');

            const datePart = `${year}-${month}-${day}`;

            // HH-MM format (e.g., 05-30)
            const hours = now.getHours().toString().padStart(2, '0');
            const minutes = now.getMinutes().toString().padStart(2, '0');

            const timePart = `${hours}-${minutes}`;

            const filename = `kanban-board-${datePart}_${timePart}.png`;
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.click();
            URL.revokeObjectURL(url);

            button.textContent = originalText;
            button.disabled = false;
        });
    });
});

//Testing
function logWindowSize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    //console.log(`Window size: ${width}x${height}`);
}
window.addEventListener('resize', logWindowSize);




initializeForFirstTimeUser();

loadSubtitle();

loadCards();