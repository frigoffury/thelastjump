/* The Last Jump - Actions Data
 * JS-wrapped JSON format for local file:// compatibility (browsers block fetch for local files)
 */

Actions = {
    "beginJourney": {
        "id": "beginJourney",
        "text": "Begin your journey",
        "actionCost": 0,
        "conditions": {
            "inChapter": { "intro": "start" }
        },
        "handler": "startCharacterCreation"
    },

    "rememberAcquaintance": {
        "id": "rememberAcquaintance",
        "text": "Try to remember an acquaintance",
        "actionCost": 1,
        "conditions": {
            "inChapter": { "intro": "awakening" }
        },
        "handler": "startAcquaintanceCreation"
    },

    "getAJob": {
        "id": "getAJob",
        "text": "Look for work",
        "actionCost": 1,
        "conditions": {
            "inChapter": { "intro": "awakening" },
            "notFlag": "hasJob"
        },
        "effects": [
            { "setFlag": "jobHunting" },
            { "showText": "You spend time asking around for work opportunities. Perhaps something will come of it." }
        ]
    }
};
