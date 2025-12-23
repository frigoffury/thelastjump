# Objectives System

Objectives are an extension of the Stories system, adding success/failure paths and completion tracking. While stories provide narrative arcs, objectives add goal-oriented gameplay with measurable outcomes.

## Design Overview

Stories can function as objectives by adding:
- Failure conditions alongside advancement conditions
- Terminal chapters marked with success or failure outcomes
- Completion effects that trigger when the objective resolves
- Progress tracking for numeric goal advancement

## Chapter Properties

| Property | Description |
|----------|-------------|
| `advanceWhen` / `advanceTo` | Success path (standard story advancement) |
| `failWhen` / `failTo` | Failure path |
| `objectiveResult` | `'success'` or `'failure'` marks terminal chapter |
| `successEffects` / `failureEffects` | Declarative effects on completion |
| `successHandler` / `failureHandler` | Handlers for complex completion logic |

## Storyline State

When a story functions as an objective, it tracks additional state:

| Field | Description |
|-------|-------------|
| `progress` | Numeric value modified by effects |
| `completed` | `true` when objectiveResult chapter reached |
| `result` | `'success'` or `'failure'` |

## Conditions

| Condition | Description |
|-----------|-------------|
| `objectiveProgress: ['storyId', 'op', value]` | Check progress value |
| `objectiveComplete: { storyId: true }` | Check if completed (any outcome) |
| `objectiveComplete: { storyId: 'success' }` | Check if completed with success |
| `objectiveComplete: { storyId: 'failure' }` | Check if completed with failure |
| `objectiveActive: 'storyId'` | Started but not completed |

## Effects

| Effect | Description |
|--------|-------------|
| `modifyObjectiveProgress: ['storyId', delta]` | Add to progress value |
| `setObjectiveProgress: ['storyId', value]` | Set progress to specific value |

## Example: Rescue Mission

An objective with sub-objectives and a deadline:

```json
{
  "rescueMission": {
    "isObjective": true,
    "title": "Rescue the Prisoner",
    "initialChapter": "planning",
    "chapters": {
      "planning": {
        "text": "You must rescue the prisoner before week 10.",
        "advanceWhen": { "objectiveProgress": ["rescueMission", ">=", 3] },
        "advanceTo": "success",
        "failWhen": { "minWeek": 10 },
        "failTo": "failure"
      },
      "success": {
        "text": "The prisoner is safe!",
        "objectiveResult": "success",
        "successEffects": [
          { "modifyStat": ["reputation", 20] },
          { "modifyObjectiveProgress": ["mainQuest", 1] }
        ]
      },
      "failure": {
        "text": "You were too late...",
        "objectiveResult": "failure",
        "failureEffects": [
          { "modifyStat": ["reputation", -10] }
        ]
      }
    }
  }
}
```

## Use Cases

- **Timed quests**: Must complete before a deadline (`failWhen: { minWeek: X }`)
- **Resource goals**: Accumulate enough progress points through actions
- **Branching outcomes**: Success and failure lead to different story branches
- **Nested objectives**: Completing sub-objectives advances parent progress

## Implementation Status

**Implemented.** See `js/condition-checker.js` and `js/effect-executor.js` for the objective-related conditions and effects.
