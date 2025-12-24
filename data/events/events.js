/* The Last Jump - Events Data
 * JS-wrapped JSON format for local file:// compatibility (browsers block fetch for local files)
 */

Events = {
    "rentDue": {
        "id": "rentDue",
        "priority": 80,
        "probability": 1.0,
        "conditions": {
            "weekDivisibleBy": 4,
            "hasObjectOfType": "home"
        },
        "handler": "processRentPayments",
        "onSuperseded": "reschedule"
    }
};
