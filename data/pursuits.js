/* The Last Jump - Pursuits Data */

Pursuits = {
    "burn_midnight_oil": {
        "title": "Burn the Midnight Oil",
        "description": "Sacrifice sleep for more time. Not sustainable.",
        "configType": "toggle",
        "default": false,
        "hoursCost": -15,
        "weeklyEffects": [
            { "modifyStat": ["health", -3] }
        ]
    },

    "frugal_living": {
        "title": "Frugal Living",
        "description": "Cut expenses to save money each week.",
        "configType": "toggle",
        "default": false,
        "hoursCost": 5,
        "weeklyEffects": [
            { "modifyStat": ["money", 10] }
        ]
    }
};
