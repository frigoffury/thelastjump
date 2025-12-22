/* The Last Jump - Entry Point - by FrigOfFury */

// Global data containers (populated from JSON)
let Actions = {};
let Events = {};
let Stories = {};

// Load JSON data files, then initialize game
async function loadGameData() {
    const [actions, events, stories] = await Promise.all([
        fetch('data/actions.json').then(r => r.json()),
        fetch('data/events/events.json').then(r => r.json()),
        fetch('data/stories/stories.json').then(r => r.json())
    ]);

    Actions = actions;
    Events = events;
    Stories = stories;
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadGameData();
    Game.init();
});
