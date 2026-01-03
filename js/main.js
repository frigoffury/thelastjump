/* The Last Jump - Entry Point - by FrigOfFury */

// Data globals (Actions, Events, Stories, Pursuits) are loaded via script tags

document.addEventListener('DOMContentLoaded', () => {
    // Initialize system menu button
    if (typeof SaveManager !== 'undefined') {
        SaveManager.init();
    }

    // Initialize debug panel (backtick to toggle)
    if (typeof DebugPanel !== 'undefined') {
        DebugPanel.init();
    }

    // Show startup screen if saves exist, otherwise start new game
    if (typeof SaveManager !== 'undefined' && Game.hasSave()) {
        SaveManager.showStartupScreen(
            () => Game.init(),
            (slot) => {
                Game.load(slot);
                Game.resumeFromLoad();
            }
        );
    } else {
        Game.init();
    }
});
