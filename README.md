# The Last Jump

*You are a Jumper—one who slips between universes, inhabiting new lives, making what you can of the precious years before The End.*

The Last Jump is a browser-based life simulation game. You play as someone who has been jumping between universe instances, each time taking on a new identity and living out a life before everything resets. While many Jumpers use this existence to live out fantasies without consequence, and others serve as dangerous "timecops" keeping The End on schedule for their own mysterious reasons, you have a different purpose: you've been trying to avert The End entirely.

You have always failed before. The odds are incalculably high that you will fail again.

But perhaps, this time, you will succeed.

---

## Project Status

This project is in early development. **Game design has barely begun**—the current focus is on building a flexible narrative engine that can support the eventual gameplay.

The engine uses a data-driven architecture where game content (actions, events, stories) is defined in JSON files, making it easy for non-programmers to author narrative content. Complex logic that can't be expressed declaratively is handled through named handler functions.

## Running the Game

Open `index.html` in a browser. No server required.

## Running Tests

```bash
node tests/test-runner.js
```
