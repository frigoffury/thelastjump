/* The Last Jump - Entry Point - by FrigOfFury */

// Global data containers (populated from JSON)
let Actions = {};
let Events = {};
let Stories = {};
let Pursuits = {};

// Load JSON data files, then initialize game
async function loadGameData() {
    const [actions, events, stories, pursuits] = await Promise.all([
        fetch('data/actions.json').then(r => r.json()),
        fetch('data/events/events.json').then(r => r.json()),
        fetch('data/stories/stories.json').then(r => r.json()),
        fetch('data/pursuits.json').then(r => r.json())
    ]);

    Actions = actions;
    Events = events;
    Stories = stories;
    Pursuits = pursuits;
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadGameData();
    Game.init();
});
