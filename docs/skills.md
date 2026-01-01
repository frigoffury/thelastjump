# Skills System

Skills represent learned abilities that affect outcomes in skill checks. Unlike possessions, skills cannot be transferred and improve through practice or training.

## Skill Hierarchy

Skills exist at two levels:

- **General skills**: Broad categories like `computers`, `athletics`, `social`
- **Specific skills**: Focused abilities like `hacking`, `sprinting`, `negotiation`

Specific skills are additive bonuses on top of general skills. When a check references a specific skill, the effective value is:

```
effectiveSkill = generalSkill + (specificSkill || 0)
```

A character with `computers: 40` and `hacking: 15` has an effective hacking skill of 55. A character with only `computers: 40` (no hacking) has an effective hacking skill of 40.

### Specific Skill Acquisition

Specific skills are gated on minimum general skill levels. You can't learn `hacking` without a baseline in `computers`. The acquisition requirements are defined per specific skill.

## Skill Definitions

Skills are declared in a data file that defines their type and relationships.

```javascript
// data/skills.js (proposed structure)
Skills = {
  // General skills
  "computers": {
    "type": "general",
    "title": "Computers",
    "description": "General computing knowledge and ability"
  },
  "athletics": {
    "type": "general",
    "title": "Athletics",
    "description": "Physical fitness and coordination"
  },

  // Specific skills (reference their parent general skill)
  "hacking": {
    "type": "specific",
    "parent": "computers",
    "title": "Hacking",
    "description": "Breaking into systems",
    "requirements": { "skill": ["computers", ">=", 20] }
  },
  "sprinting": {
    "type": "specific",
    "parent": "athletics",
    "title": "Sprinting",
    "description": "Short bursts of speed",
    "requirements": { "skill": ["athletics", ">=", 15] }
  }
}
```

**Fields**:
| Field | Required | Description |
|-------|----------|-------------|
| `type` | Yes | `"general"` or `"specific"` |
| `parent` | For specific | Which general skill this builds on |
| `title` | Yes | Display name |
| `description` | No | Explanatory text |
| `requirements` | No | Conditions to acquire this skill |

## Skill Checks

Skill checks determine success or failure when attempting something with uncertain outcome.

### Formula

```
result = effectiveSkill + diceRoll
outcome = compare result against difficulty
```

### Dice Notation

Authors specify variability using tabletop dice notation:

| Notation | Range | Distribution |
|----------|-------|--------------|
| 1d20 | 1-20 | Flat (uniform) |
| 2d6 | 2-12 | Bell curve (weighted to middle) |
| 3d4 | 3-12 | Tighter bell curve |
| 1d100 | 1-100 | Wide flat range |

Multiple dice create bell curves; single dice create flat distributions.

### Outcome Tiers

Four consistent tiers, determined by result vs difficulty:

| Tier | Condition |
|------|-----------|
| Crushing failure | `result < difficulty - crushMargin` |
| Failure | `result < difficulty` |
| Success | `result >= difficulty` |
| Crushing success | `result >= difficulty + crushMargin` |

If `crushMargin` is not specified, only success/failure apply.

## Check Data Structure

### Full skill check with all tiers

```json
{
  "skillCheck": {
    "skill": "hacking",
    "dice": "2d6",
    "difficulty": 50,
    "crushMargin": 15
  },
  "outcomes": {
    "crushingFailure": {
      "text": "The system locks you out permanently.",
      "effects": [{ "setFlag": "locked_out" }]
    },
    "failure": {
      "text": "You can't find a way in.",
      "effects": []
    },
    "success": {
      "text": "You breach the firewall.",
      "effects": [{ "setFlag": "system_accessed" }]
    },
    "crushingSuccess": {
      "text": "You're in, and you've covered your tracks completely.",
      "effects": [
        { "setFlag": "system_accessed" },
        { "setFlag": "undetected" }
      ]
    }
  }
}
```

### Binary check (success/failure only)

```json
{
  "skillCheck": {
    "skill": "athletics",
    "dice": "1d20",
    "difficulty": 30
  },
  "onSuccess": {
    "text": "You clear the gap.",
    "effects": [{ "setFlag": "crossed_chasm" }]
  },
  "onFailure": {
    "text": "You don't quite make it.",
    "effects": [{ "modifyStat": ["health", -10] }]
  }
}
```

### Dynamic difficulty

Difficulty can reference entity skills with simple arithmetic:

```json
{
  "skillCheck": {
    "skill": "hacking",
    "dice": "2d6",
    "difficulty": "rival.skills.computers + 10"
  }
}
```

**Supported formats**:
- Static: `50`
- Reference: `"opponent.skills.hacking"`
- Expression: `"opponent.skills.hacking + 10"`, `"guard.skills.perception - 5"`

## Showing Odds

Before attempting a skill check, players can see an estimate of their chances. The system compares `effectiveSkill + averageDiceRoll` against the difficulty thresholds.

| Estimate | Meaning |
|----------|---------|
| Very unlikely | Average result below difficulty by significant margin |
| Unlikely | Average result below difficulty |
| Possible | Average result near difficulty |
| Likely | Average result above difficulty |
| Very likely | Average result above difficulty by significant margin |

## Character Skill Storage

Skills are stored on individual characters in `state.characters[id]`:

```javascript
state.characters["char_123"] = {
  id: "char_123",
  name: "Alex",
  skills: {
    general: {
      computers: 40,
      athletics: 25
    },
    specific: {
      hacking: 15
    }
  },
  // ... other character fields
}
```

When resolving `player.skills.hacking`, the system:
1. Finds `hacking` in skill definitions, notes `parent: "computers"`
2. Gets `player.skills.specific.hacking` (15) + `player.skills.general.computers` (40)
3. Returns effective skill: 55

## Implementation Status

**Not yet implemented.** This document describes the target design.

### To Be Finalized

- **Skill definitions file**: Exact structure and location of `data/skills.js`
- **Full skill list**: Which general and specific skills exist in the game

### Deferred

- **Skill improvement**: Mechanics for how skills increase over time (game-specific rules apply)
- **Low-skill attempt cost**: Additional cost for attempting checks where skill level is insufficient
- **Opposed rolls**: Multi-participant checks where difficulty is determined by opposing side's rolls
