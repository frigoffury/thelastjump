# Pursuits System

Pursuits represent ongoing activities that occupy the player character's time and generate weekly effects. Unlike actions (one-time choices) or stories (narrative arcs with progression), pursuits are persistent states that produce continuous impact.

## Examples

- **Employment**: Factory worker, office job, freelance work
- **Education**: Enrolled in school, self-study, apprenticeship
- **Routines**: Fitness regimen, makeup routine, meditation practice
- **Hobbies**: Editing Wikipedia, photography, writing
- **Lifestyle choices**: Frugal living, social butterfly, burn the midnight oil

## Design Principles

### Progress is Emergent

Pursuits don't track their own progress. Instead, they generate effects (flags, possessions, stat changes) that other systems react to. A "become a Twitch streamer" story might check for a `glamour` possession and high `skills.cosmetics`—both produced by the makeup pursuit.

### Two Entry Modes

**Action-gated pursuits** require a story or action to start/stop. Getting hired, enrolling in school, joining a sports league—these are meaningful choices that happen through gameplay.

**Configurable pursuits** can be adjusted freely by the player at week start. Makeup routine, fitness regimen, investment amounts—these are lifestyle choices the player manages directly.

## Time Budget

Players have **50 free hours per week** for pursuits. Beyond that, pursuits eat into action points:

```
pursuitHours = sum of active pursuit costs
excessHours = max(0, pursuitHours - 50)
actionPenalty = excessHours / 20

effectiveActions = baseActions - actionPenalty
guaranteedActions = floor(effectiveActions)
bonusActionChance = effectiveActions - guaranteedActions
```

| Pursuit Hours | Excess | Penalty | Effective Actions | Result |
|---------------|--------|---------|-------------------|--------|
| 40 | 0 | 0 | 3.0 | 3 actions |
| 50 | 0 | 0 | 3.0 | 3 actions |
| 62 | 12 | 0.6 | 2.4 | 2 + 40% chance of 3rd |
| 90 | 40 | 2.0 | 1.0 | 1 action |

Some pursuits have **negative hour costs** (e.g., "burn the midnight oil" at -15 hours), giving time back at a cost (health, stress).

## Configuration Types

| Type | UI Element | Player Control |
|------|------------|----------------|
| `action` | Read-only display | Start/stop via game actions only |
| `toggle` | Checkbox | On/off at week start |
| `select` | Dropdown | Choose option at week start |
| `number` | Input field | Enter value at week start |

## Data Structure

### Select Example (Makeup)

```json
{
  "makeup": {
    "title": "Makeup Routine",
    "description": "How much effort you put into your appearance.",

    "configType": "select",
    "default": "none",
    "options": {
      "none": {
        "title": "None",
        "hoursCost": 0,
        "weeklyEffects": []
      },
      "natural": {
        "title": "Natural",
        "hoursCost": 2,
        "weeklyEffects": [
          { "modifyStat": ["skills.cosmetics", 1], "max": 15 },
          { "ensurePossession": ["appearance_boost", { "level": 1 }] }
        ]
      },
      "refined": {
        "title": "Refined",
        "requirements": { "stat": ["skills.cosmetics", ">=", 15] },
        "hoursCost": 5,
        "weeklyEffects": [
          { "modifyStat": ["skills.cosmetics", 1], "max": 40 },
          { "ensurePossession": ["appearance_boost", { "level": 2 }] }
        ]
      },
      "glamorous": {
        "title": "Glamorous",
        "requirements": { "hasFlag": "knows_glamour_technique" },
        "hoursCost": 8,
        "weeklyEffects": [
          { "modifyStat": ["skills.cosmetics", 2], "max": 60 },
          { "ensurePossession": ["glamour", { "quality": "skills.cosmetics" }] }
        ]
      }
    }
  }
}
```

### Number Example (Investment)

```json
{
  "investment": {
    "title": "Weekly Investment",
    "description": "Amount to invest each week.",

    "configType": "number",
    "default": 0,
    "min": 0,
    "maxStat": "money",
    "step": 50,
    "hoursCost": 1,
    "weeklyEffects": [
      { "modifyStat": ["money", "-$input"] },
      { "modifyStat": ["portfolio", "+$input"] }
    ]
  }
}
```

### Action-Gated Example (Employment)

```json
{
  "factory_job": {
    "title": "Factory Worker",
    "description": "Grueling but steady work at the local factory.",

    "configType": "action",
    "hoursCost": 40,
    "weeklyEffects": [
      { "modifyStat": ["money", 75] },
      { "setFlag": "employed" }
    ],

    "tags": ["employment", "full_time"],
    "exclusive": ["full_time"],

    "exitConditions": { "hasFlag": "factory_closed" },
    "exitEffects": [
      { "clearFlag": "employed" },
      { "showText": "The factory has closed. You're out of work." }
    ]
  }
}
```

### Negative Time Example

```json
{
  "burn_midnight_oil": {
    "title": "Burn the Midnight Oil",
    "description": "Sacrifice sleep for more time. Not sustainable.",

    "configType": "toggle",
    "hoursCost": -15,
    "weeklyEffects": [
      { "modifyStat": ["health", -3] },
      { "modifyStat": ["stress", 5] }
    ]
  }
}
```

## Fields Reference

| Field | Required | Description |
|-------|----------|-------------|
| `title` | Yes | Display name |
| `description` | No | Explanatory text for UI |
| `configType` | Yes | `action`, `toggle`, `select`, or `number` |
| `default` | No | Default option key (select) or value (number/toggle). Defaults to first option, 0, or false. |
| `options` | For select | Map of option key to option definition |
| `min`, `max`, `step` | For number | Input constraints (defaults: 0, 9999, 1) |
| `maxStat` | For number | Dynamic max based on player stat |
| `hoursCost` | No | Weekly time cost, can be negative (defaults to 0) |
| `weeklyEffects` | No | Effects applied each week while active (defaults to []) |
| `requirements` | No | Conditions on options (pursuit-level not yet implemented) |
| `tags` | No | Categories for grouping |
| `exclusive` | No | Tags this pursuit conflicts with |
| `exitConditions` | For action | Conditions that auto-terminate the pursuit |
| `exitEffects` | No | Effects when pursuit ends |

## Week Flow

```
Week Start
  1. Show pursuit management UI
     - Display action-gated pursuits (read-only)
     - Allow configuration of toggle/select/number pursuits
  2. Player confirms pursuit configuration
  3. Calculate total pursuit hours and action budget
  4. Process weeklyEffects for all active pursuits

Week Actions
  5. Player takes actions (count determined by pursuit load)
  6. Events and stories evaluate after each action

Week End
  7. Check exitConditions for action-gated pursuits
  8. Advance to next week, return to step 1
```

## Story Integration

Stories spawn pursuits via effect:
```json
{ "startPursuit": "factory_job" }
```

Stories end pursuits via effect:
```json
{ "endPursuit": "factory_job" }
```

Stories check pursuit state via conditions:
```json
{ "pursuitActive": "factory_job" }
{ "pursuitOption": ["makeup", "glamorous"] }
{ "pursuitHours": [">=", 60] }
```

## New Effects (Required)

| Effect | Description |
|--------|-------------|
| `startPursuit` | Activate an action-gated pursuit |
| `endPursuit` | Deactivate a pursuit |
| `ensurePossession` | Create or update a possession |

## New Conditions (Required)

| Condition | Description |
|-----------|-------------|
| `pursuitActive` | Check if a pursuit is active |
| `pursuitOption` | Check current option for a select pursuit |
| `pursuitHours` | Check total weekly pursuit hours |

## Implementation Status

**Implemented** in commit following initial design. Core files:
- `js/pursuit-manager.js` - Core logic
- `js/condition-checker.js` - Pursuit conditions
- `js/effect-executor.js` - Pursuit effects
- `data/pursuits.json` - Sample pursuits

### Implementation Notes

**pursuitActive for toggles**: Returns true only if both `active` AND `enabled` are true. A disabled toggle is not considered "active" for condition purposes.

**Exclusive tag checking**: Implementation checks bidirectionally - both the new pursuit's `exclusive` against existing pursuits' `tags`, AND existing pursuits' `exclusive` against the new pursuit's `tags`.

### Not Yet Implemented

- **Pursuit-level `requirements`**: Only option-level requirements (for select pursuits) are currently checked. Top-level `requirements` on a pursuit definition is not enforced.
- **Dynamic stat references in state**: The `ensurePossession` effect passes state values literally. References like `{ "quality": "skills.cosmetics" }` are not resolved to actual stat values.
