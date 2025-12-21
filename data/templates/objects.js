/* The Last Jump - Object Templates - by FrigOfFury */

const ObjectTemplates = {
    item: {
        portable: true,
        state: {}
    },
    location: {
        portable: false,
        state: {}
    },
    acquaintance: {
        portable: false,
        state: {
            targetCharId: null,     // The NPC this acquaintance links to
            relationshipType: null, // 'enemy', 'loved_one', 'neutral', etc.
            strength: 50            // Relationship strength (0-100)
        }
    }
};
