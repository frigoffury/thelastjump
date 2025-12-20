/* The Last Jump - Event Definitions - by FrigOfFury */

const Events = {
    rentDue: {
        priority: 80,
        probability: 1.0,
        conditions: {
            weekDivisibleBy: 4,
            playerHasObjectOfType: 'home'
        },
        onTrigger: (game) => {
            const pid = game.state.playerId;
            const homes = game.getCharacterObjectsOfType(pid, 'home');
            const results = [];

            for (const home of homes) {
                const rent = home.state.rent || 100;
                if (game.getStat(pid, 'money') >= rent) {
                    game.modifyStat(pid, 'money', -rent);
                    results.push(`Paid $${rent} for ${home.name}.`);
                } else {
                    game.removeObject(home.id, pid);
                    results.push(`Evicted from ${home.name} - couldn't afford $${rent}.`);
                }
            }

            return {
                text: 'Rent day.\n\n' + results.join('\n'),
                choices: [{ text: 'Continue', action: 'dismiss' }]
            };
        },
        onSuperseded: 'reschedule'
    }
};
