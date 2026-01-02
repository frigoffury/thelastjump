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

## General Skills

### Physical (5)

| Skill | Description |
|-------|-------------|
| Athletics | Running, jumping, climbing, swimming |
| Stealth | Sneaking, hiding, shadowing, avoiding detection |
| Melee | Fighting with weapons or body (unarmed is a specific skill) |
| Firearms | Shooting guns and similar modern weapons |
| Projectiles | Archery, throwing knives, traditional ranged weapons |

### Social (4)

| Skill | Description |
|-------|-------------|
| Persuasion | Convincing, negotiating, charming |
| Deception | Lying, acting, misdirection |
| Intimidation | Threatening, coercing |
| Empathy | Reading emotions, building rapport |

### Technical (6)

| Skill | Description |
|-------|-------------|
| Computers | Operating systems, hacking, digital manipulation |
| Mechanics | Machines, vehicles, locks, physical systems |
| Electronics | Circuits, devices, wiring |
| Treatment | First aid, stabilizing injuries, medical procedures |
| Driving | Ground vehicles, pursuit, evasion |
| Piloting | Aircraft, watercraft, spacecraft |

### Mental (3)

| Skill | Description |
|-------|-------------|
| Calculation | Quick mental math, numerical analysis |
| Analysis | Puzzle-solving, pattern recognition, strategic thinking |
| Jumper Awareness | Integrating past-life perception without leaving traces |

**Total: 18 general skills**

## Specific Skills

Specific skills are additive bonuses under a parent general skill.

### Physical

| Specific Skill | Parent | Description |
|----------------|--------|-------------|
| Unarmed | Melee | Hand-to-hand combat without weapons |
| Blades | Melee | Knives, swords, edged weapons |
| Sleight of Hand | Stealth | Pickpocketing, palming, prestidigitation |
| Parkour | Athletics | Urban movement, vaulting, climbing in motion |

### Social

| Specific Skill | Parent | Description |
|----------------|--------|-------------|
| Contract Negotiation | Persuasion | Formal bargaining, deal-making, legal agreements |
| Disguise | Deception | Altering appearance, adopting personas |

### Technical

| Specific Skill | Parent | Description |
|----------------|--------|-------------|
| Hacking | Computers | Breaking into secure systems |
| Lockpicking | Mechanics | Bypassing physical locks |
| Security Systems | Electronics | Alarms, cameras, electronic locks |

### Mental

| Specific Skill | Parent | Description |
|----------------|--------|-------------|
| Deep Integration | Jumper Awareness | Letting past knowledge inform current-identity intuitions safely |
| Controlled Recall | Jumper Awareness | Calling on past experience for active insight without trace |

## Skill Definition Format

Skills are declared in a data file:

```javascript
// data/skills.js
Skills = {
  // General skill
  "athletics": {
    "type": "general",
    "title": "Athletics",
    "description": "Running, jumping, climbing, swimming"
  },

  // Specific skill (references parent)
  "unarmed": {
    "type": "specific",
    "parent": "melee",
    "title": "Unarmed",
    "description": "Hand-to-hand combat without weapons",
    "requirements": { "skill": ["melee", ">=", 15] }
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

### Composite Checks

Complex actions may involve multiple factors. Use `bonuses` to add stat contributions to the player's roll, and `modifiers` to adjust difficulty based on conditions.

```json
{
  "skillCheck": {
    "skill": "parkour",
    "dice": "2d6",
    "difficulty": 50,
    "bonuses": [
      { "stat": "strength", "scale": 0.3 }
    ],
    "modifiers": [
      { "condition": { "stat": ["health", "<", 50] }, "add": 10 },
      { "condition": { "stat": ["health", "<", 20] }, "add": 15 },
      { "condition": { "hasFlag": "wearing_heels" }, "add": 10 },
      { "condition": { "hasFlag": "wet_surface" }, "add": 5 },
      { "condition": { "hasFlag": "padded_clothes" }, "add": -5 }
    ]
  }
}
```

**Resolution:**
```
playerRoll = skill + sum(stat × scale for each bonus) + diceRoll
effectiveDifficulty = difficulty + sum(add for each matching modifier)
outcome = compare playerRoll vs effectiveDifficulty
```

**Bonuses**: Stats that contribute to the player's roll (scaled).

**Modifiers**: Conditions that adjust difficulty. Positive values make it harder, negative values make it easier. All matching modifiers stack cumulatively.

In the example above, a character with health at 15 triggers both `< 50` (+10) and `< 20` (+15), adding +25 to difficulty. Wearing padded clothes offsets by -5.

## Showing Odds

Before attempting a skill check, players can see an estimate of their chances. The system compares `effectiveSkill + averageDiceRoll` against the difficulty thresholds.

| Estimate | Meaning |
|----------|---------|
| Very unlikely | Average result below difficulty by significant margin |
| Unlikely | Average result below difficulty |
| Possible | Average result near difficulty |
| Likely | Average result above difficulty |
| Very likely | Average result above difficulty by significant margin |

## Deep Memory Skills

Player characters are Jumpers who have lived many lives across different identities. They can draw on skills from past lives, but doing so is risky—it attracts timecop attention and leaves traces in their brain that investigators could detect.

### Two Skill Layers

- **Current identity skills**: What the player has learned in their current life. Safe to use, grow through play.
- **Deep memory skills**: Expertise from past lives. Powerful but risky.

### Deep Skill Bonus

When a player chooses to tap deep memory before a skill check:

| Condition | Bonus |
|-----------|-------|
| Has matching deep skill specialty | +100 |
| No matching specialty (generic past-life experience) | +30 |

All Jumpers can tap deep memory for the +30 generic bonus. Specialties chosen at character creation provide the +100 bonus for specific skills.

### Trace Types

Two trace types track deep skill exposure:

- **timecop_suspicion**: Risk of attracting timecop attention
- **deepskill_use**: Evidence left in the brain detectable during close examination

Both traces are only added when explicitly specified in story effects—neither is automatic. A clean getaway might add no traces. Players may also learn techniques to obscure certain neurological traces.

Both trace types degrade slowly over time and can be impacted by other actions.

### Active vs Passive Use

**Active use**: Player explicitly chooses to tap deep memory before a roll. Adds bonus; trace costs specified by the triggering action or story.

**Passive check**: Stories can check `hasDeepSkill` to determine consequences without the player actively choosing. Trace costs are only added if the story explicitly includes them in effects.

### Example: Branching by Skill Type

```json
{
  "id": "ambush",
  "branches": [
    {
      "skillCheck": {
        "skill": "unarmed",
        "dice": "2d6",
        "difficulty": 50
      },
      "onSuccess": {
        "text": "You fight them off with skills from your current life."
      }
    },
    {
      "conditions": { "hasDeepSkill": "unarmed" },
      "text": "Your body moves in ways this identity never learned.",
      "effects": [
        { "modifyStat": ["timecop_suspicion", 10] },
        { "modifyStat": ["deepskill_use", 5] }
      ]
    },
    {
      "text": "You never see the blade coming.",
      "effects": [{ "triggerJump": true }]
    }
  ]
}
```

The story checks current identity skills first, falls back to deep skill with explicit trace costs, then handles the worst outcome.

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
  deepSkills: ["hacking", "piloting"],  // specialties from past lives
  // ... other character fields
}
```

When resolving `player.skills.hacking`, the system:
1. Finds `hacking` in skill definitions, notes `parent: "computers"`
2. Gets `player.skills.specific.hacking` (15) + `player.skills.general.computers` (40)
3. Returns effective skill: 55

When tapping deep memory for a hacking check:
1. Check if `"hacking"` is in `player.deepSkills`
2. If yes: +100 bonus. If no: +30 bonus (generic past-life experience)

## Implementation Status

**Implemented.** Core skill system and ability checks are functional.

### Implemented

- **Skill definitions file**: `data/skills.js` with general and specific skill definitions
- **Ability checks**: `js/ability-checker.js` handles dice rolls, bonuses, modifiers, and crushing outcomes
- **Check definitions**: `data/ability-checks.js` for reusable named checks
- **Deep skill specialties**: Selected during jumper identity creation via strategies (see `data/jumper-identity.js`)

### Deferred

- **Skill improvement**: Mechanics for how skills increase over time (game-specific rules apply)
- **Opposed rolls**: Multi-participant checks where difficulty is determined by opposing side's rolls
- **Trace degradation**: How timecop_suspicion and deepskill_use decay over time
- **Trace mitigation**: Actions or techniques that reduce or obscure traces
