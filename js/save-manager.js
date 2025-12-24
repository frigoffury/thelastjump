/* The Last Jump - Save Manager
 * Handles save/load UI including startup screen, system menu, and save prompts.
 */

const SaveManager = {
    // Format relative time (e.g., "2 hours ago")
    formatRelativeTime(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 60) return 'just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
        const days = Math.floor(hours / 24);
        return `${days} day${days !== 1 ? 's' : ''} ago`;
    },

    // Format slot info for display
    formatSlotInfo(slotInfo) {
        if (!slotInfo.exists) {
            return { label: 'Empty', detail: '' };
        }
        const meta = slotInfo.meta;
        const label = slotInfo.slot === 'autosave'
            ? 'Autosave'
            : `Slot ${slotInfo.slot + 1}`;
        const weekText = `Week ${meta.week}`;
        const timeText = meta.savedAt ? this.formatRelativeTime(meta.savedAt) : '';
        const charText = meta.characterName && meta.characterName !== 'Unknown'
            ? meta.characterName
            : '';
        const detail = [charText, weekText, timeText].filter(Boolean).join(' • ');
        return { label, detail };
    },

    // Render a list of save slots
    renderSlotList(slots, mode, onSelect) {
        let html = '<div class="save-slot-list">';
        for (const slot of slots) {
            const info = this.formatSlotInfo(slot);
            const isEmpty = !slot.exists;
            const isDisabled = mode === 'load' && isEmpty;
            const classes = ['save-slot'];
            if (isEmpty) classes.push('empty');
            if (isDisabled) classes.push('disabled');

            html += `<button class="${classes.join(' ')}"
                data-slot="${slot.slot}"
                ${isDisabled ? 'disabled' : ''}>
                <span class="save-slot-label">${info.label}</span>
                <span class="save-slot-meta">${isEmpty ? 'Empty' : info.detail}</span>
            </button>`;
        }
        html += '</div>';
        return html;
    },

    // Show startup screen when saves exist
    showStartupScreen(onNewGame, onLoad) {
        const container = document.getElementById('startup-modal');
        if (!container) return onNewGame();

        const slots = Game.getAllSaveSlots();
        const hasAnySave = slots.some(s => s.exists);

        if (!hasAnySave) {
            container.style.display = 'none';
            return onNewGame();
        }

        let html = '<div class="modal-content startup-content">';
        html += '<h1>The Last Jump</h1>';
        html += '<div class="startup-buttons">';
        html += '<button class="choice-btn" id="startup-new-game">New Game</button>';
        html += '<button class="choice-btn" id="startup-load-game">Continue</button>';
        html += '</div>';
        html += '</div>';

        container.innerHTML = html;
        container.style.display = 'flex';

        document.getElementById('startup-new-game').addEventListener('click', () => {
            container.style.display = 'none';
            onNewGame();
        });

        document.getElementById('startup-load-game').addEventListener('click', () => {
            this.showLoadModal(null, (slot) => {
                container.style.display = 'none';
                onLoad(slot);
            }, () => {
                // Cancelled, show startup again
                this.showStartupScreen(onNewGame, onLoad);
            });
        });
    },

    // Show save slot picker
    showSaveModal(game, onComplete) {
        const container = document.getElementById('save-modal');
        if (!container) return onComplete();

        // Only show numbered slots for manual saves (not autosave)
        const allSlots = Game.getAllSaveSlots();
        const slots = allSlots.filter(s => s.slot !== 'autosave');

        let html = '<div class="modal-content">';
        html += '<h2>Save Game</h2>';
        html += this.renderSlotList(slots, 'save');
        html += '<div class="modal-actions">';
        html += '<button class="choice-btn secondary" id="save-cancel">Cancel</button>';
        html += '</div>';
        html += '</div>';

        container.innerHTML = html;
        container.style.display = 'flex';

        // Slot click handlers
        container.querySelectorAll('.save-slot').forEach(btn => {
            btn.addEventListener('click', () => {
                const slot = parseInt(btn.dataset.slot, 10);
                Game.save(slot);
                container.style.display = 'none';
                onComplete();
            });
        });

        document.getElementById('save-cancel').addEventListener('click', () => {
            container.style.display = 'none';
            onComplete();
        });
    },

    // Show load slot picker
    showLoadModal(game, onLoad, onCancel) {
        const container = document.getElementById('load-modal');
        if (!container) return onCancel();

        const slots = Game.getAllSaveSlots();

        let html = '<div class="modal-content">';
        html += '<h2>Load Game</h2>';
        html += this.renderSlotList(slots, 'load');
        html += '<div class="modal-actions">';
        html += '<button class="choice-btn secondary" id="load-cancel">Cancel</button>';
        html += '</div>';
        html += '</div>';

        container.innerHTML = html;
        container.style.display = 'flex';

        // Slot click handlers
        container.querySelectorAll('.save-slot:not(.disabled)').forEach(btn => {
            btn.addEventListener('click', () => {
                const slot = btn.dataset.slot === 'autosave' ? 'autosave' : parseInt(btn.dataset.slot, 10);
                container.style.display = 'none';
                onLoad(slot);
            });
        });

        document.getElementById('load-cancel').addEventListener('click', () => {
            container.style.display = 'none';
            onCancel();
        });
    },

    // Show system menu (accessible during gameplay)
    showSystemMenu(game) {
        const container = document.getElementById('system-modal');
        if (!container) return;

        let html = '<div class="modal-content">';
        html += '<h2>Menu</h2>';
        html += '<div class="system-menu-buttons">';
        html += '<button class="choice-btn" id="system-save">Save Game</button>';
        html += '<button class="choice-btn" id="system-load">Load Game</button>';
        html += '<button class="choice-btn secondary" id="system-resume">Resume</button>';
        html += '</div>';
        html += '</div>';

        container.innerHTML = html;
        container.style.display = 'flex';

        document.getElementById('system-save').addEventListener('click', () => {
            container.style.display = 'none';
            this.showSaveModal(game, () => {});
        });

        document.getElementById('system-load').addEventListener('click', () => {
            container.style.display = 'none';
            this.showLoadModal(game, (slot) => {
                Game.load(slot);
                Game.resumeFromLoad();
            }, () => {
                // Cancelled, show system menu again
                this.showSystemMenu(game);
            });
        });

        document.getElementById('system-resume').addEventListener('click', () => {
            container.style.display = 'none';
        });
    },

    // Show week-end save prompt (simpler than full save modal)
    showWeekEndSavePrompt(game, onContinue) {
        const container = document.getElementById('weekend-save-modal');
        if (!container) return onContinue();

        let html = '<div class="modal-content">';
        html += `<h2>Week ${game.state.week}</h2>`;
        html += '<p>Your progress has been autosaved.</p>';
        html += '<div class="modal-actions">';
        html += '<button class="choice-btn" id="weekendsave-save">Save to Slot</button>';
        html += '<button class="choice-btn" id="weekendsave-continue">Continue</button>';
        html += '</div>';
        html += '</div>';

        container.innerHTML = html;
        container.style.display = 'flex';

        document.getElementById('weekendsave-save').addEventListener('click', () => {
            container.style.display = 'none';
            this.showSaveModal(game, onContinue);
        });

        document.getElementById('weekendsave-continue').addEventListener('click', () => {
            container.style.display = 'none';
            onContinue();
        });
    },

    // Initialize system menu button handler
    init() {
        const systemBtn = document.getElementById('system-btn');
        if (systemBtn) {
            systemBtn.addEventListener('click', () => {
                this.showSystemMenu(Game);
            });
        }
    }
};
