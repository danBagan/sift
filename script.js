let cards = [];
let currentColumn = '';
let editingCardId = null;
let deletingCardId = null;
let selectedTags = [];
let activeFilters = [];

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

function saveCards() {
    localStorage.setItem('kanbanCards', JSON.stringify(cards));
}

function renderAllCards() {
    document.querySelectorAll('.cards').forEach(container => {
        container.innerHTML = '';
    });

    cards.forEach(card => {
        createCardElement(card);
    });

    updateCardCounts();
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
    if (e.key === '/') {
        e.preventDefault();
        document.getElementById('searchBox').focus();
    }

    // n - Add new card to backlog
    if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        openModal('backlog');
    }

    // ? - Toggle keyboard shortcuts help
    if (e.key === '?') {
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
        // Create a new canvas with padding
        const padding = 60;
        const newCanvas = document.createElement('canvas');
        newCanvas.width = canvas.width + (padding * 2);
        newCanvas.height = canvas.height + (padding * 2);

        const ctx = newCanvas.getContext('2d');
        ctx.fillStyle = '#fef6e4';
        ctx.fillRect(0, 0, newCanvas.width, newCanvas.height);
        ctx.drawImage(canvas, padding, padding);

        newCanvas.toBlob((blob) => {
            // --- 👇 NEW CODE STARTS HERE 👇 ---
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

            // Combine with underscore separator: kanban-board-2025-12-13_05-30.png
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

function logWindowSize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    console.log(`Window size: ${width}x${height}`);
}
window.addEventListener('resize', logWindowSize);


loadSubtitle();

loadCards();