/* The Last Jump - Pursuit Manager - by FrigOfFury
 *
 * Manages ongoing activities (pursuits) that occupy player time and generate weekly effects.
 *
 * Pursuit config types:
 *   - action: Started/stopped via game actions only (jobs, school enrollment)
 *   - toggle: Player can enable/disable at week start (fitness routine, meditation)
 *   - select: Player chooses from options at week start (makeup style, workout type)
 *   - number: Player enters a value at week start (investment amount, study hours)
 *
 * Time budget:
 *   - 50 free hours per week for pursuits
 *   - Beyond 50, each 20 hours costs 1 action point
 *   - Fractional action points become probability of bonus action
 *
 * See docs/pursuits.md for full design documentation.
 */

const PursuitManager = {
    // Configuration
    FREE_HOURS: 50,
    HOURS_PER_ACTION: 20,

    // Callback for when pursuit UI is confirmed
    pendingConfirm: null,

    // Initialize pursuit state for a new game
    initDefaults(game) {
        game.state.pursuits = {};
        // Activate any non-action pursuits with their defaults
        for (const [id, pursuit] of Object.entries(Pursuits)) {
            if (pursuit.configType !== 'action') {
                this.activatePursuit(game, id);
            }
        }
    },

    // Activate a pursuit with default values
    activatePursuit(game, pursuitId) {
        const pursuit = Pursuits[pursuitId];
        if (!pursuit) return;

        const state = { active: true, startedWeek: game.state.week };

        switch (pursuit.configType) {
            case 'toggle':
                state.enabled = pursuit.default ?? false;
                break;
            case 'select':
                state.option = pursuit.default ?? Object.keys(pursuit.options)[0];
                break;
            case 'number':
                state.value = pursuit.default ?? 0;
                break;
            // 'action' type has no additional config
        }

        game.state.pursuits[pursuitId] = state;
    },

    // Deactivate a pursuit (for action-gated or forced removal)
    deactivatePursuit(game, pursuitId) {
        const pursuit = Pursuits[pursuitId];
        const state = game.state.pursuits[pursuitId];
        if (!state || !state.active) return;

        // Run exit effects
        if (pursuit && pursuit.exitEffects) {
            EffectExecutor.execute(pursuit.exitEffects, game);
        }

        // Mark inactive
        state.active = false;
    },

    // Calculate total pursuit hours for the week
    calculatePursuitHours(game) {
        let total = 0;
        for (const [pursuitId, state] of Object.entries(game.state.pursuits)) {
            if (!state.active) continue;
            total += this.getPursuitHoursCost(game, pursuitId);
        }
        return total;
    },

    // Get hours cost for a specific pursuit based on current config
    getPursuitHoursCost(game, pursuitId) {
        const pursuit = Pursuits[pursuitId];
        const state = game.state.pursuits[pursuitId];
        if (!pursuit || !state || !state.active) return 0;

        switch (pursuit.configType) {
            case 'action':
                return pursuit.hoursCost || 0;

            case 'toggle':
                if (!state.enabled) return 0;
                return pursuit.hoursCost || 0;

            case 'select':
                const option = pursuit.options?.[state.option];
                return option?.hoursCost || 0;

            case 'number':
                // Number pursuits have flat cost when active (value > 0)
                if (state.value > 0) {
                    return pursuit.hoursCost || 0;
                }
                return 0;

            default:
                return 0;
        }
    },

    // Calculate effective actions for the week based on pursuit load
    calculateEffectiveActions(game) {
        const baseActions = Config.actionsPerPeriod;
        const pursuitHours = this.calculatePursuitHours(game);

        const excessHours = Math.max(0, pursuitHours - this.FREE_HOURS);
        const actionPenalty = excessHours / this.HOURS_PER_ACTION;
        const effectiveActions = Math.max(0, baseActions - actionPenalty);

        return {
            guaranteed: Math.floor(effectiveActions),
            bonusChance: effectiveActions - Math.floor(effectiveActions)
        };
    },

    // Check exit conditions for all action-gated pursuits
    checkExitConditions(game) {
        for (const [pursuitId, state] of Object.entries(game.state.pursuits)) {
            if (!state.active) continue;
            const pursuit = Pursuits[pursuitId];
            if (!pursuit || pursuit.configType !== 'action') continue;

            if (pursuit.exitConditions && ConditionChecker.check(pursuit.exitConditions, game)) {
                this.deactivatePursuit(game, pursuitId);
            }
        }
    },

    // Process weekly effects for all active pursuits
    // weeklyEffects are arrays of standard effects (modifyStat, setFlag, etc.)
    // defined on each pursuit. This method handles special pursuit features
    // ($input substitution, max capping) then delegates to EffectExecutor.
    processWeeklyEffects(game) {
        for (const [pursuitId, state] of Object.entries(game.state.pursuits)) {
            if (!state.active) continue;

            const pursuit = Pursuits[pursuitId];
            if (!pursuit) continue;

            // Get the appropriate effects based on config type
            let effects = [];
            let context = { pursuitId, pursuitValue: null };

            switch (pursuit.configType) {
                case 'action':
                    effects = pursuit.weeklyEffects || [];
                    break;

                case 'toggle':
                    if (state.enabled) {
                        effects = pursuit.weeklyEffects || [];
                    }
                    break;

                case 'select':
                    const option = pursuit.options?.[state.option];
                    effects = option?.weeklyEffects || [];
                    break;

                case 'number':
                    if (state.value > 0) {
                        effects = pursuit.weeklyEffects || [];
                        context.pursuitValue = state.value;
                    }
                    break;
            }

            // Execute effects with context for $input substitution
            if (effects.length > 0) {
                this.executeWeeklyEffects(game, effects, context);
            }
        }
    },

    // Execute weekly effects with special handling for pursuit-specific features
    executeWeeklyEffects(game, effects, context) {
        const processedEffects = [];

        for (const effect of effects) {
            const processed = { ...effect };

            // Handle $input substitution for number pursuits
            if (context.pursuitValue != null && processed.modifyStat) {
                let delta = processed.modifyStat[1];
                if (typeof delta === 'string') {
                    if (delta === '-$input') {
                        delta = -context.pursuitValue;
                    } else if (delta === '+$input' || delta === '$input') {
                        delta = context.pursuitValue;
                    } else {
                        delta = parseFloat(delta) || 0;
                    }
                    processed.modifyStat = [processed.modifyStat[0], delta];
                }
            }

            // Handle max-capped stat modifications
            if (processed.max != null && processed.modifyStat) {
                const [statName, delta] = processed.modifyStat;
                const currentValue = game.getStat(game.state.playerId, statName);
                if (currentValue >= processed.max) {
                    continue; // Skip this effect - already at max
                }
                // Cap the delta so it doesn't exceed max
                const cappedDelta = Math.min(delta, processed.max - currentValue);
                processed.modifyStat = [statName, cappedDelta];
                delete processed.max; // Remove max so EffectExecutor doesn't see it
            }

            processedEffects.push(processed);
        }

        if (processedEffects.length > 0) {
            EffectExecutor.execute(processedEffects, game);
        }
    },

    // Check if activating a pursuit would conflict with existing pursuits
    // Checks both directions: new pursuit's exclusive vs existing tags,
    // and existing pursuit's exclusive vs new pursuit's tags
    getConflictingPursuits(game, pursuitId) {
        const pursuit = Pursuits[pursuitId];
        if (!pursuit) return [];

        const conflicts = [];
        for (const [otherId, state] of Object.entries(game.state.pursuits)) {
            if (otherId === pursuitId || !state.active) continue;
            const other = Pursuits[otherId];
            if (!other) continue;

            // Check if new pursuit's exclusive tags conflict with existing pursuit's tags
            if (pursuit.exclusive && other.tags) {
                const hasConflict = pursuit.exclusive.some(tag => other.tags.includes(tag));
                if (hasConflict) {
                    conflicts.push(otherId);
                    continue;
                }
            }

            // Check if existing pursuit's exclusive tags conflict with new pursuit's tags
            if (other.exclusive && pursuit.tags) {
                const hasConflict = other.exclusive.some(tag => pursuit.tags.includes(tag));
                if (hasConflict) {
                    conflicts.push(otherId);
                }
            }
        }
        return conflicts;
    },

    // Check if an option is available based on its requirements
    isOptionAvailable(game, pursuitId, optionKey) {
        const pursuit = Pursuits[pursuitId];
        if (!pursuit?.options?.[optionKey]) return false;

        const option = pursuit.options[optionKey];
        if (!option.requirements) return true;

        return ConditionChecker.check(option.requirements, game);
    },

    // Get available options for a select pursuit
    getAvailableOptions(game, pursuitId) {
        const pursuit = Pursuits[pursuitId];
        if (!pursuit?.options) return [];

        return Object.entries(pursuit.options)
            .filter(([key, opt]) => !opt.requirements || ConditionChecker.check(opt.requirements, game))
            .map(([key, opt]) => ({ key, ...opt }));
    },

    // Check if there are any configurable pursuits to show
    hasConfigurablePursuits(game) {
        for (const [pursuitId, pursuit] of Object.entries(Pursuits)) {
            // Show UI if there's a non-action pursuit
            if (pursuit.configType !== 'action') return true;
            // Or if there's an active action pursuit to display
            const state = game.state.pursuits[pursuitId];
            if (state?.active) return true;
        }
        return false;
    },

    // Show the pursuit management UI
    showPursuitUI(game, onConfirm) {
        // If no pursuits to configure, skip UI
        if (!this.hasConfigurablePursuits(game)) {
            onConfirm();
            return;
        }

        this.renderPursuitPanel(game);
        this.pendingConfirm = onConfirm;
    },

    // Render the pursuit management panel
    renderPursuitPanel(game) {
        const container = document.getElementById('pursuit-panel');
        if (!container) return;

        let html = '<div class="modal-content">';
        html += '<h2>Weekly Pursuits</h2>';
        html += '<div class="pursuit-list">';

        for (const [pursuitId, pursuit] of Object.entries(Pursuits)) {
            const state = game.state.pursuits[pursuitId];

            // Skip inactive action pursuits
            if (pursuit.configType === 'action' && (!state || !state.active)) continue;

            html += this.renderPursuitItem(game, pursuitId, pursuit, state);
        }

        html += '</div>';
        html += this.renderHoursSummary(game);
        html += '<button id="confirm-pursuits" class="choice-btn">Start Week</button>';
        html += '</div>';

        container.innerHTML = html;
        container.style.display = 'flex';

        // Attach event listeners
        this.attachPursuitListeners(game, container);
    },

    // Render a single pursuit item based on its config type
    renderPursuitItem(game, pursuitId, pursuit, state) {
        let html = `<div class="pursuit-item" data-pursuit="${pursuitId}">`;
        html += `<div class="pursuit-title">${pursuit.title}</div>`;
        if (pursuit.description) {
            html += `<div class="pursuit-desc">${pursuit.description}</div>`;
        }

        switch (pursuit.configType) {
            case 'action':
                html += `<div class="pursuit-status">Active (${pursuit.hoursCost || 0}h/week)</div>`;
                break;

            case 'toggle':
                const checked = state?.enabled ? 'checked' : '';
                html += `<label class="pursuit-toggle"><input type="checkbox" ${checked} data-type="toggle"> `;
                html += `Enable (${pursuit.hoursCost || 0}h/week)</label>`;
                break;

            case 'select':
                html += '<select data-type="select" class="pursuit-select">';
                for (const [key, opt] of Object.entries(pursuit.options)) {
                    const available = this.isOptionAvailable(game, pursuitId, key);
                    const selected = state?.option === key ? 'selected' : '';
                    const disabled = available ? '' : 'disabled';
                    html += `<option value="${key}" ${selected} ${disabled}>`;
                    html += `${opt.title} (${opt.hoursCost || 0}h)</option>`;
                }
                html += '</select>';
                break;

            case 'number':
                const max = pursuit.maxStat
                    ? game.getStat(game.state.playerId, pursuit.maxStat)
                    : pursuit.max ?? 9999;
                html += `<input type="number" data-type="number" class="pursuit-number" `;
                html += `value="${state?.value || 0}" `;
                html += `min="${pursuit.min || 0}" max="${max}" step="${pursuit.step || 1}">`;
                html += ` (${pursuit.hoursCost || 0}h when active)`;
                break;
        }

        html += '</div>';
        return html;
    },

    // Render hours summary and action projection
    renderHoursSummary(game) {
        const hours = this.calculatePursuitHours(game);
        const actions = this.calculateEffectiveActions(game);
        const isOverBudget = hours > this.FREE_HOURS;

        let html = '<div class="hours-summary">';
        html += `<div class="${isOverBudget ? 'hours-warning' : ''}">`;
        html += `Pursuit Hours: ${hours}/${this.FREE_HOURS} free</div>`;
        html += `<div>Actions This Week: ${actions.guaranteed}`;
        if (actions.bonusChance > 0) {
            html += ` (+${Math.round(actions.bonusChance * 100)}% chance of extra)`;
        }
        html += '</div></div>';
        return html;
    },

    // Attach change listeners to pursuit inputs
    attachPursuitListeners(game, container) {
        // Toggle listeners
        container.querySelectorAll('input[data-type="toggle"]').forEach(input => {
            input.addEventListener('change', (e) => {
                const pursuitId = e.target.closest('.pursuit-item').dataset.pursuit;
                game.state.pursuits[pursuitId].enabled = e.target.checked;
                this.updateHoursSummary(game, container);
            });
        });

        // Select listeners
        container.querySelectorAll('select[data-type="select"]').forEach(select => {
            select.addEventListener('change', (e) => {
                const pursuitId = e.target.closest('.pursuit-item').dataset.pursuit;
                game.state.pursuits[pursuitId].option = e.target.value;
                this.updateHoursSummary(game, container);
            });
        });

        // Number listeners
        container.querySelectorAll('input[data-type="number"]').forEach(input => {
            input.addEventListener('change', (e) => {
                const pursuitId = e.target.closest('.pursuit-item').dataset.pursuit;
                game.state.pursuits[pursuitId].value = parseFloat(e.target.value) || 0;
                this.updateHoursSummary(game, container);
            });
        });

        // Confirm button
        const confirmBtn = container.querySelector('#confirm-pursuits');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                container.style.display = 'none';
                if (this.pendingConfirm) {
                    this.pendingConfirm();
                    this.pendingConfirm = null;
                }
            });
        }
    },

    // Update just the hours summary (for live updates)
    updateHoursSummary(game, container) {
        const summary = container.querySelector('.hours-summary');
        if (summary) {
            summary.outerHTML = this.renderHoursSummary(game);
        }
    }
};
