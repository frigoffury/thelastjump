#!/bin/bash
# Build script for The Last Jump - creates distributable zip

OUTPUT="thelastjump.zip"

# Check if output already exists
if [ -f "$OUTPUT" ]; then
    echo "Error: $OUTPUT already exists. Remove it first or choose a different name."
    exit 1
fi

# Create zip with only game files
if zip -r "$OUTPUT" \
    index.html \
    css/ \
    data/ \
    js/condition-checker.js \
    js/effect-executor.js \
    js/handlers.js \
    js/text-interpolation.js \
    js/character-creation.js \
    js/game.js \
    js/main.js \
    -x "*.DS_Store"; then
    echo "Created $OUTPUT"
else
    echo "Error: Failed to create zip"
    exit 1
fi
