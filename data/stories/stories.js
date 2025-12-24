/* The Last Jump - Stories Data
 * JS-wrapped JSON format for local file:// compatibility (browsers block fetch for local files)
 */

Stories = {
    "intro": {
        "title": "The Beginning",
        "initialChapter": "start",
        "chapters": {
            "start": {
                "text": "You open your eyes. The details of your new life settle into place—some sharp, some hazy, taking the place of memory of you last life, as it had displaced the life before it. The deeper facts, though, remain: you are a Jumper—one who slips between universes, inhabiting new lives, making what you can of the precious years before The End. Many Jumpers are enjoying lives crafted for them in which they can live out their dreams before The End wipes away consequences. Some are timecops tasked with keeping The End on schedule for their own inscrutable reasons. You, however, have been trying to avert The End.\n\nYou have always failed before. The odds are incalculably high that you will fail again. But perhaps, this time, you will succeed.\n\nA new universe awaits. A new identity. A new chance.",
                "showText": "onEnter",
                "advanceWhen": { "hasFlag": "character_created" },
                "advanceTo": "awakening"
            },
            "awakening": {
                "text": "Possibilities stretch out before you. The End is coming, but not yet. You have time. For now.",
                "showText": "onEnter"
            }
        }
    }
};
