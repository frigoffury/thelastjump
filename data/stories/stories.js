/* The Last Jump - Story Definitions - by FrigOfFury
 *
 * Stories are narrative arcs with chapters that auto-advance based on conditions.
 * Multiple stories can be active simultaneously; their text combines in the display.
 * Stories don't define actions directly - actions are separate entities that
 * reference story state in their conditions.
 *
 * Story structure:
 *   title: string - display name for the storyline
 *   initialChapter: string - which chapter to start at when story is entered
 *   chapters: object - map of chapterId to chapter definition
 *
 * Chapter structure:
 *   text: string - narrative text for this chapter
 *   showText: 'onEnter' | 'always'
 *     'onEnter' - show text once when player first enters this chapter
 *     'always' - show text on every display refresh while in this chapter
 *   advanceWhen: object - conditions that trigger auto-advancement
 *     hasFlag: string - advance when this global flag is set
 *     minWeek: number - advance when game week >= this value
 *   advanceTo: string - chapterId to advance to when conditions met
 *
 * Storyline evaluation happens after each action and at week end.
 * When advanceWhen conditions are met, chapter advances automatically.
 */

const Stories = {
    intro: {
        title: 'The Beginning',
        initialChapter: 'start',
        chapters: {
            start: {
                text: 'You are a Jumper—one who slips between universes, inhabiting new lives, trying to avert The End.\n\nYou have failed before. You will fail again. But perhaps, this time, you will succeed.\n\nA new universe awaits. A new identity. A new chance.',
                showText: 'onEnter',
                advanceWhen: { hasFlag: 'character_created' },
                advanceTo: 'awakening'
            },
            awakening: {
                text: 'You open your eyes. The memories of your new life settle into place—some sharp, some hazy. You know who you are now, even if the person you were before feels like a fading dream.\n\nThe world stretches out before you. The End is coming, but not yet. You have time. For now.',
                showText: 'onEnter'
                // No advanceWhen - player stays here until other storylines/events progress
            }
        }
    }
};
