/* The Last Jump - Text Interpolation - by FrigOfFury
 *
 * Dynamic text generation based on character/object properties.
 * Handles pronouns, verb conjugation, and property access.
 *
 * Syntax:
 *   [entity:pronoun]       - Pronoun lookup (subject, object, possessive, reflexive)
 *   [entity.prop.path]     - Property access via dot notation
 *   [entity.prop|fallback] - Property with fallback if null/undefined
 *   {entity:plural/singular} - Verb form based on grammatical number
 *
 * Capitalization:
 *   [entity:subject] → "she"
 *   [entity:Subject] → "She"
 *   [entity:SUBJECT] → "SHE"
 *
 * Examples:
 *   interpolate("[player:Subject] {player:swing/swings} [player:possessive] [player.weapon.name|fists].", context)
 *   → "She swings her sword." or "They swing their fists."
 *
 * Context object maps entity names to characters/objects:
 *   { player: Game.getPlayer(), target: someNPC }
 */

const TextInterpolation = {
    // Pronoun tables by gender
    // number: 'singular' (he/she) or 'plural' (they) for verb conjugation
    pronouns: {
        male: {
            subject: 'he',
            object: 'him',
            possessive: 'his',
            reflexive: 'himself',
            number: 'singular'
        },
        female: {
            subject: 'she',
            object: 'her',
            possessive: 'her',
            reflexive: 'herself',
            number: 'singular'
        },
        nonbinary: {
            subject: 'they',
            object: 'them',
            possessive: 'their',
            reflexive: 'themself',
            number: 'plural'
        }
    },

    // Default pronouns when gender is unknown
    defaultGender: 'nonbinary',

    // Main interpolation function
    interpolate(template, context) {
        let result = template;

        // Handle [entity:pronoun] and [entity.property|fallback]
        result = result.replace(/\[([^\]]+)\]/g, (match, inner) => {
            return this.resolveBracket(inner, context);
        });

        // Handle {entity:plural/singular} verb forms
        result = result.replace(/\{([^:]+):([^/]+)\/([^}]+)\}/g, (match, entity, plural, singular) => {
            return this.resolveVerb(entity, plural, singular, context);
        });

        return result;
    },

    // Resolve [entity:pronoun] or [entity.property|fallback]
    resolveBracket(inner, context) {
        // Check for fallback
        let fallback = null;
        const pipeIndex = inner.indexOf('|');
        if (pipeIndex !== -1) {
            fallback = inner.slice(pipeIndex + 1);
            inner = inner.slice(0, pipeIndex);
        }

        // Split into entity and path
        const colonIndex = inner.indexOf(':');
        if (colonIndex !== -1) {
            // Pronoun lookup: [entity:pronoun]
            const entity = inner.slice(0, colonIndex);
            const pronounType = inner.slice(colonIndex + 1);
            return this.resolvePronoun(entity, pronounType, context);
        } else {
            // Property access: [entity.prop.path]
            return this.resolveProperty(inner, context, fallback);
        }
    },

    // Resolve pronoun with capitalization preservation
    resolvePronoun(entityName, pronounType, context) {
        const entity = context[entityName];
        if (!entity) return `[${entityName}:${pronounType}]`;

        const gender = entity.gender || this.defaultGender;
        const pronounTable = this.pronouns[gender] || this.pronouns[this.defaultGender];

        // Determine capitalization from pronounType
        const lowerType = pronounType.toLowerCase();
        let pronoun = pronounTable[lowerType];

        if (!pronoun) return `[${entityName}:${pronounType}]`;

        // Apply capitalization
        if (pronounType === pronounType.toUpperCase()) {
            pronoun = pronoun.toUpperCase();
        } else if (pronounType[0] === pronounType[0].toUpperCase()) {
            pronoun = pronoun[0].toUpperCase() + pronoun.slice(1);
        }

        return pronoun;
    },

    // Resolve property path like entity.weapon.name
    resolveProperty(path, context, fallback) {
        const parts = path.split('.');
        let value = context;

        for (const part of parts) {
            if (value == null) break;
            value = value[part];
        }

        if (value == null || value === '') {
            return fallback ?? `[${path}]`;
        }

        return String(value);
    },

    // Resolve verb form based on grammatical number
    resolveVerb(entityName, pluralForm, singularForm, context) {
        const entity = context[entityName];
        if (!entity) return pluralForm; // Default to plural if entity not found

        const gender = entity.gender || this.defaultGender;
        const pronounTable = this.pronouns[gender] || this.pronouns[this.defaultGender];

        return pronounTable.number === 'plural' ? pluralForm : singularForm;
    },

    // Convenience method that uses Game's characters
    format(template, entityMap) {
        const context = {};
        for (const [name, charId] of Object.entries(entityMap)) {
            if (typeof charId === 'string') {
                context[name] = Game.getCharacter(charId);
            } else {
                context[name] = charId; // Already an object
            }
        }
        return this.interpolate(template, context);
    }
};
