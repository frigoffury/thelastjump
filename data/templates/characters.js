/* The Last Jump - Character Templates - by FrigOfFury */

const CharacterTemplates = {
    human: {
        stats: {},  // Uses StatDefinitions defaults
        traits: [],
        gender: null  // Set during creation: 'male', 'female', 'nonbinary'
    },
    player: {
        extends: 'human'
    }
    // Add character types as needed: werewolf, vampire, etc.
};

// Valid gender values
const Genders = ['male', 'female', 'nonbinary'];
