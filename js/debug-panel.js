/* The Last Jump - Debug Panel
 * Shows internal game state for beta testers.
 * Toggle with backtick (`) key.
 */

const DebugPanel = {
    visible: false,

    init() {
        document.addEventListener('keydown', (e) => {
            if (e.key === '`' && !e.ctrlKey && !e.altKey && !e.metaKey) {
                e.preventDefault();
                this.toggle();
            }
        });

        // Click outside to close
        const modal = document.getElementById('debug-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hide();
                }
            });
        }
    },

    toggle() {
        if (this.visible) {
            this.hide();
        } else {
            this.show();
        }
    },

    show() {
        const modal = document.getElementById('debug-modal');
        if (!modal) return;

        modal.innerHTML = this.render();
        modal.style.display = 'flex';
        this.visible = true;
    },

    hide() {
        const modal = document.getElementById('debug-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.visible = false;
    },

    render() {
        let html = '<div class="modal-content debug-content">';
        html += '<h2>Debug Info</h2>';
        html += '<p style="color:#888;font-size:0.8rem;">Press ` or click outside to close</p>';

        // Game state summary
        html += '<div class="debug-section">';
        html += '<h3>Game State</h3>';
        html += this.renderGameState();
        html += '</div>';

        // Player stats
        html += '<div class="debug-section">';
        html += '<h3>Player Stats</h3>';
        html += this.renderPlayerStats();
        html += '</div>';

        // Flags
        html += '<div class="debug-section">';
        html += '<h3>Flags</h3>';
        html += this.renderFlags();
        html += '</div>';

        // Last check
        html += '<div class="debug-section">';
        html += '<h3>Last Ability Check</h3>';
        html += this.renderLastCheck();
        html += '</div>';

        // Jumper identity
        html += '<div class="debug-section">';
        html += '<h3>Jumper Identity</h3>';
        html += this.renderJumperIdentity();
        html += '</div>';

        html += '</div>';
        return html;
    },

    renderGameState() {
        if (typeof Game === 'undefined' || !Game.state) {
            return '<p>Game not initialized</p>';
        }

        const s = Game.state;
        let html = '<table class="debug-table">';
        html += `<tr><td>Week</td><td>${s.week}</td></tr>`;
        html += `<tr><td>Actions</td><td>${s.actionsRemaining}/${s.actionsPerWeek}</td></tr>`;

        // Current story chapter
        if (s.storylines?.intro) {
            html += `<tr><td>Story Chapter</td><td>${s.storylines.intro.currentChapter}</td></tr>`;
        }

        html += '</table>';
        return html;
    },

    renderPlayerStats() {
        if (typeof Game === 'undefined' || !Game.state?.playerId) {
            return '<p>No player</p>';
        }

        const player = Game.getPlayer();
        if (!player?.state?.stats) {
            return '<p>No stats</p>';
        }

        let html = '<table class="debug-table">';
        for (const [stat, value] of Object.entries(player.state.stats)) {
            html += `<tr><td>${stat}</td><td>${value}</td></tr>`;
        }
        html += '</table>';
        return html;
    },

    renderFlags() {
        if (typeof Game === 'undefined' || !Game.state?.flags) {
            return '<p>No flags</p>';
        }

        const flags = Object.keys(Game.state.flags).filter(f => Game.state.flags[f]);
        if (flags.length === 0) {
            return '<p>None set</p>';
        }

        return '<p>' + flags.join(', ') + '</p>';
    },

    renderLastCheck() {
        if (typeof AbilityChecker === 'undefined' || !AbilityChecker.lastResult) {
            return '<p>No checks performed yet</p>';
        }

        const r = AbilityChecker.lastResult;
        let html = '<table class="debug-table">';

        // Skill info
        html += `<tr><td>Skill</td><td>${r.skill}</td></tr>`;
        html += `<tr><td>Base Skill</td><td>${r.baseSkillValue}</td></tr>`;

        // Deep memory
        if (r.useDeepMemory && r.deepMemoryBonus) {
            html += `<tr><td>Deep Memory</td><td>+${r.deepMemoryBonus}</td></tr>`;
        }

        // Applied bonuses
        if (r.appliedBonuses && r.appliedBonuses.length > 0) {
            for (const b of r.appliedBonuses) {
                html += `<tr><td>Bonus (${b.stat})</td><td>+${b.value}</td></tr>`;
            }
        }

        html += `<tr><td>Total Skill</td><td>${r.skillValue}</td></tr>`;
        html += `<tr><td>Dice</td><td>${r.dice}</td></tr>`;
        html += `<tr><td>Roll</td><td>${r.roll}</td></tr>`;
        html += `<tr><td><strong>Player Total</strong></td><td><strong>${r.playerRoll}</strong> (${r.skillValue} + ${r.roll})</td></tr>`;

        // Difficulty breakdown
        html += `<tr><td colspan="2" style="border-top:1px solid #444;padding-top:0.5rem;"></td></tr>`;
        html += `<tr><td>Base Difficulty</td><td>${r.baseDifficulty}</td></tr>`;

        // Applied modifiers
        if (r.appliedModifiers && r.appliedModifiers.length > 0) {
            for (const m of r.appliedModifiers) {
                const condStr = this.formatCondition(m.condition);
                const sign = m.add >= 0 ? '+' : '';
                html += `<tr><td>Modifier</td><td>${sign}${m.add} (${condStr})</td></tr>`;
            }
        }

        html += `<tr><td><strong>Final Difficulty</strong></td><td><strong>${r.effectiveDifficulty}</strong></td></tr>`;

        // Result
        html += `<tr><td colspan="2" style="border-top:1px solid #444;padding-top:0.5rem;"></td></tr>`;
        html += `<tr><td>Margin</td><td>${r.margin >= 0 ? '+' : ''}${r.margin}</td></tr>`;
        const outcomeColor = r.outcome.includes('Success') || r.outcome === 'success' ? '#4f4' : '#f44';
        html += `<tr><td><strong>Outcome</strong></td><td style="color:${outcomeColor}"><strong>${r.outcome}</strong></td></tr>`;

        html += '</table>';
        return html;
    },

    formatCondition(condition) {
        if (!condition) return '?';
        // Simple formatting for common condition types
        if (condition.stat) {
            const [stat, op, val] = condition.stat;
            return `${stat} ${op} ${val}`;
        }
        if (condition.hasFlag) {
            return `flag: ${condition.hasFlag}`;
        }
        // Fallback: JSON stringify
        return JSON.stringify(condition);
    },

    renderJumperIdentity() {
        if (typeof Game === 'undefined' || !Game.state?.jumperIdentity) {
            return '<p>Not created yet</p>';
        }

        const j = Game.state.jumperIdentity;
        let html = '<table class="debug-table">';
        html += `<tr><td>Core Gender</td><td>${j.coreGender}</td></tr>`;
        html += `<tr><td>Attracted To</td><td>${j.attractedTo?.join(', ') || 'none'}</td></tr>`;
        html += `<tr><td>Aspirations</td><td>${j.aspirations?.join(', ') || 'none'}</td></tr>`;
        html += `<tr><td>Strategies</td><td>${j.strategies?.join(', ') || 'none'}</td></tr>`;
        html += `<tr><td>Deep Skills</td><td>${j.deepSkills?.join(', ') || 'none'}</td></tr>`;
        html += '</table>';
        return html;
    }
};
