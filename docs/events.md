# Events System

Events are random or conditional occurrences that can interrupt gameplay. They are evaluated after each action and at week boundaries.

## Event Definition

Events are defined in `data/events/events.js`:

```javascript
Events = {
    "rentDue": {
        "id": "rentDue",
        "priority": 80,
        "probability": 1.0,
        "conditions": {
            "weekDivisibleBy": 4,
            "hasObjectOfType": "home"
        },
        "handler": "processRentPayments",
        "onSuperseded": "reschedule"
    }
}
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier |
| `priority` | number | Higher priority events trigger first when multiple are eligible |
| `probability` | number | 0-1, chance of occurring when conditions are met (default: 1) |
| `conditions` | object | Declarative conditions that must be met |
| `handler` | string | Name of handler function in `js/handlers.js` |
| `effects` | array | Declarative effects if no handler |
| `text` | string | Display text if no handler/effects |
| `onSuperseded` | string | `"remove"` or `"reschedule"` - what happens when a higher-priority event wins |

## Probability Scheduling

Events with `probability < 1` use a scheduling system to ensure consistent weekly probabilities regardless of how many actions the player takes.

### The Problem

Without scheduling, a 20% probability event checked 4 times per week (3 actions + week end) would have:
- P(triggers) = 1 - (0.8)^4 = 59%

This makes probability depend on action count, which is undesirable.

### The Solution

1. **At week start**: Roll all currently eligible probabilistic events once
2. **Assign trigger time**: Events that pass get a random `triggerAt` value in [0, 1]
3. **Spread across week**: Events trigger when week progress reaches their `triggerAt`

Week progress is calculated as:
```
progress = actionsUsed / (totalActions + 1)
```

With 3 actions:
- Week start: 0
- After action 1: 0.25
- After action 2: 0.5
- After action 3: 0.75
- Week end: 1.0

### Mid-Week Eligibility

Events can become eligible mid-week (due to flags, story state, etc.). When this happens:
1. Roll probability immediately
2. Assign `triggerAt` in [0, 1]
3. If `triggerAt < currentProgress`, event **misses this week**

This naturally pro-rates probability. An event becoming eligible at 50% progress has only 50% of its normal weekly chance.

### State Structure

```javascript
state.eventSchedule = {
    "eventId": {
        passed: true,      // Whether probability roll succeeded
        triggerAt: 0.37,   // When in week to trigger (0-1)
        triggered: false,  // Whether event has fired
        missed: false      // True if triggerAt < progress when scheduled
    }
}
```

## Evaluation Flow

```
evaluateEvents():
  1. scheduleNewEvents()  // Roll any newly eligible probabilistic events
  2. For each event:
     - Skip if completed or conditions not met
     - For probabilistic events, check schedule:
       - Must have passed roll
       - Must not be missed
       - Must have reached trigger time
       - Must not have already triggered
  3. Sort eligible events by priority
  4. Execute highest priority event
  5. Handle superseded events (remove or keep for later)
```

## Priority and Superseding

When multiple events are eligible simultaneously:
- Highest `priority` wins and executes
- Lower-priority events are handled based on `onSuperseded`:
  - `"remove"`: Event is marked completed, won't trigger again
  - `"reschedule"`: Event stays eligible for next evaluation

## Handlers vs Effects

Events can use either:
- **Handler**: Custom function for complex logic
- **Effects**: Declarative array processed by EffectExecutor

Handler example:
```javascript
Handlers.processRentPayments = function(game, event, context) {
    // Complex logic here
    return { text: "Rent is due!", choices: [...] };
};
```

Effects example:
```javascript
{
    "effects": [
        { "modifyStat": ["money", -100] },
        { "showText": "You paid your rent." }
    ]
}
```
