/* The Last Jump - Character Renderer - by FrigOfFury
 *
 * SVG-based character visualization with morphable attributes.
 * Characters are rendered as layered SVG paths that interpolate
 * between states based on stats like weight, muscle, hair length.
 *
 * Approach:
 *   - Base paths define the default character shape
 *   - Morph targets define how paths change at stat extremes
 *   - Stats (0-1) interpolate between base and target
 *   - Layers: body silhouette, clothing, hair, face features
 *
 * Usage:
 *   const svg = CharacterRenderer.render(character, {
 *       weight: 0.5,      // 0 = thin, 1 = heavy
 *       muscle: 0.3,      // 0 = soft, 1 = defined
 *       hairLength: 0.7,  // 0 = bald, 1 = long
 *       pregnant: 0       // 0 = no, 1 = full term
 *   });
 */

const CharacterRenderer = {
    // SVG dimensions
    width: 100,
    height: 200,

    // Color palettes by skin tone (can expand later)
    skinTones: {
        light: { fill: '#f5d0c5', stroke: '#d4a999' },
        medium: { fill: '#d4a574', stroke: '#b8956a' },
        dark: { fill: '#8d5524', stroke: '#704214' }
    },

    // Clothing colors
    clothingColors: {
        tunic: { fill: '#4a6741', stroke: '#3a5331' },
        robe: { fill: '#5c4a6d', stroke: '#4c3a5d' }
    },

    // Hair colors
    hairColors: {
        black: '#1a1a1a',
        brown: '#4a3728',
        blonde: '#c9a86c',
        red: '#8b3a3a',
        gray: '#888888',
        white: '#d8d8d8'
    },

    // Base body path points (simple humanoid silhouette)
    // Format: [x, y] coordinates, will be scaled to SVG dimensions
    // These define a front-facing simple body shape
    basePaths: {
        // Head (ellipse-ish)
        head: {
            type: 'ellipse',
            cx: 50, cy: 25,
            rx: 15, ry: 18
        },

        // Torso - array of points forming a path
        torso: {
            type: 'path',
            base: [
                [35, 45],   // left shoulder
                [30, 80],   // left waist
                [32, 110],  // left hip
                [50, 115],  // crotch
                [68, 110],  // right hip
                [70, 80],   // right waist
                [65, 45]    // right shoulder
            ],
            // How points shift when weight = 1
            weightMorph: [
                [33, 45],   // shoulders slightly wider
                [22, 85],   // waist much wider
                [25, 115],  // hips wider
                [50, 120],  // crotch lower
                [75, 115],
                [78, 85],
                [67, 45]
            ],
            // How points shift when muscle = 1
            muscleMorph: [
                [32, 45],   // shoulders wider
                [30, 78],   // waist tighter
                [33, 108],  // hips moderate
                [50, 113],
                [67, 108],
                [70, 78],
                [68, 45]
            ],
            // Pregnancy morph (additive belly)
            pregnantMorph: [
                [35, 45],
                [28, 85],   // belly out
                [30, 115],
                [50, 118],
                [70, 115],
                [72, 85],
                [65, 45]
            ]
        },

        // Left arm
        leftArm: {
            type: 'path',
            base: [
                [35, 47],   // shoulder
                [25, 55],   // upper arm out
                [20, 75],   // elbow
                [18, 100],  // forearm
                [20, 105]   // hand
            ],
            weightMorph: [
                [33, 47],
                [20, 57],
                [14, 77],
                [12, 102],
                [14, 107]
            ],
            muscleMorph: [
                [32, 47],
                [20, 55],
                [15, 75],
                [14, 100],
                [16, 105]
            ]
        },

        // Right arm (mirrored)
        rightArm: {
            type: 'path',
            base: [
                [65, 47],
                [75, 55],
                [80, 75],
                [82, 100],
                [80, 105]
            ],
            weightMorph: [
                [67, 47],
                [80, 57],
                [86, 77],
                [88, 102],
                [86, 107]
            ],
            muscleMorph: [
                [68, 47],
                [80, 55],
                [85, 75],
                [86, 100],
                [84, 105]
            ]
        },

        // Left leg
        leftLeg: {
            type: 'path',
            base: [
                [38, 112],  // hip
                [35, 140],  // thigh
                [33, 170],  // knee
                [32, 195],  // ankle
                [28, 198],  // foot
                [38, 198]
            ],
            weightMorph: [
                [32, 115],
                [28, 142],
                [26, 172],
                [26, 196],
                [22, 199],
                [34, 199]
            ]
        },

        // Right leg (mirrored)
        rightLeg: {
            type: 'path',
            base: [
                [62, 112],
                [65, 140],
                [67, 170],
                [68, 195],
                [72, 198],
                [62, 198]
            ],
            weightMorph: [
                [68, 115],
                [72, 142],
                [74, 172],
                [74, 196],
                [78, 199],
                [66, 199]
            ]
        }
    },

    // Hair styles with length variations
    hairStyles: {
        short: {
            base: [
                [35, 18], [38, 8], [50, 5], [62, 8], [65, 18]
            ],
            // Extended points for longer hair
            longExtension: [
                [30, 45], [25, 70], [30, 95],  // left side
                [70, 95], [75, 70], [70, 45]   // right side
            ]
        }
    },

    // Interpolate between two point arrays
    lerpPoints(base, target, t) {
        return base.map((point, i) => {
            const targetPoint = target[i] || point;
            return [
                point[0] + (targetPoint[0] - point[0]) * t,
                point[1] + (targetPoint[1] - point[1]) * t
            ];
        });
    },

    // Convert points array to SVG path string
    pointsToPath(points, closed = true) {
        if (points.length === 0) return '';
        let d = `M ${points[0][0]} ${points[0][1]}`;
        for (let i = 1; i < points.length; i++) {
            d += ` L ${points[i][0]} ${points[i][1]}`;
        }
        if (closed) d += ' Z';
        return d;
    },

    // Apply morphs to a body part based on stats
    getMorphedPoints(partDef, stats) {
        let points = [...partDef.base.map(p => [...p])];

        // Apply weight morph
        if (partDef.weightMorph && stats.weight) {
            points = this.lerpPoints(points, partDef.weightMorph, stats.weight);
        }

        // Apply muscle morph (can combine with weight)
        if (partDef.muscleMorph && stats.muscle) {
            const musclePoints = this.lerpPoints(partDef.base, partDef.muscleMorph, stats.muscle);
            // Blend muscle on top of current
            points = this.lerpPoints(points, musclePoints, stats.muscle * 0.5);
        }

        // Apply pregnancy morph
        if (partDef.pregnantMorph && stats.pregnant) {
            points = this.lerpPoints(points, partDef.pregnantMorph, stats.pregnant);
        }

        return points;
    },

    // Generate hair path based on length
    getHairPath(hairLength, baseY = 18) {
        const style = this.hairStyles.short;

        if (hairLength < 0.1) {
            // Bald - no hair
            return null;
        }

        let points = [...style.base];

        if (hairLength > 0.3) {
            // Add length extensions
            const ext = style.longExtension;
            const lengthFactor = (hairLength - 0.3) / 0.7; // 0-1 for medium to long

            // Left side flows down
            const leftBottom = [
                30 - lengthFactor * 5,
                18 + lengthFactor * 80
            ];
            // Right side flows down
            const rightBottom = [
                70 + lengthFactor * 5,
                18 + lengthFactor * 80
            ];

            points = [
                [30 - lengthFactor * 5, 20],
                ...style.base,
                [70 + lengthFactor * 5, 20],
                rightBottom,
                [50, 20 + lengthFactor * 90],
                leftBottom
            ];
        }

        return this.pointsToPath(points);
    },

    // Main render function
    render(character, stats = {}) {
        const s = {
            weight: stats.weight ?? 0.5,
            muscle: stats.muscle ?? 0.2,
            hairLength: stats.hairLength ?? 0.5,
            pregnant: stats.pregnant ?? 0
        };

        const skinTone = this.skinTones[character.skinTone || 'medium'];
        const hairColor = this.hairColors[character.hairColor || 'brown'];
        const clothing = this.clothingColors.tunic;

        let svg = `<svg viewBox="0 0 ${this.width} ${this.height}" xmlns="http://www.w3.org/2000/svg">`;

        // Background (optional, for debugging)
        // svg += `<rect width="100%" height="100%" fill="#1a1a2e"/>`;

        // Draw body parts in order (back to front)

        // Legs
        for (const leg of ['leftLeg', 'rightLeg']) {
            const points = this.getMorphedPoints(this.basePaths[leg], s);
            svg += `<path d="${this.pointsToPath(points)}" fill="${skinTone.fill}" stroke="${skinTone.stroke}" stroke-width="1"/>`;
        }

        // Arms (behind torso)
        for (const arm of ['leftArm', 'rightArm']) {
            const points = this.getMorphedPoints(this.basePaths[arm], s);
            svg += `<path d="${this.pointsToPath(points, false)}" fill="none" stroke="${skinTone.fill}" stroke-width="8" stroke-linecap="round"/>`;
            svg += `<path d="${this.pointsToPath(points, false)}" fill="none" stroke="${skinTone.stroke}" stroke-width="1" stroke-linecap="round"/>`;
        }

        // Torso
        const torsoPoints = this.getMorphedPoints(this.basePaths.torso, s);
        svg += `<path d="${this.pointsToPath(torsoPoints)}" fill="${skinTone.fill}" stroke="${skinTone.stroke}" stroke-width="1"/>`;

        // Simple clothing overlay (tunic)
        const clothingPoints = torsoPoints.map(p => [...p]);
        // Adjust clothing to cover torso
        clothingPoints[0][1] += 5;  // lower neckline
        clothingPoints[6][1] += 5;
        svg += `<path d="${this.pointsToPath(clothingPoints)}" fill="${clothing.fill}" stroke="${clothing.stroke}" stroke-width="1" opacity="0.9"/>`;

        // Head
        const head = this.basePaths.head;
        svg += `<ellipse cx="${head.cx}" cy="${head.cy}" rx="${head.rx}" ry="${head.ry}" fill="${skinTone.fill}" stroke="${skinTone.stroke}" stroke-width="1"/>`;

        // Simple face (eyes, minimal features)
        svg += `<ellipse cx="44" cy="23" rx="2" ry="2.5" fill="#333"/>`; // left eye
        svg += `<ellipse cx="56" cy="23" rx="2" ry="2.5" fill="#333"/>`; // right eye
        svg += `<ellipse cx="50" cy="30" rx="1.5" ry="1" fill="${skinTone.stroke}"/>`; // nose hint
        svg += `<path d="M 45 35 Q 50 38 55 35" fill="none" stroke="#aa6655" stroke-width="1.5"/>`; // mouth

        // Hair
        const hairPath = this.getHairPath(s.hairLength);
        if (hairPath) {
            svg += `<path d="${hairPath}" fill="${hairColor}" stroke="${hairColor}" stroke-width="1"/>`;
        }

        svg += '</svg>';
        return svg;
    },

    // Render to a DOM element
    renderTo(elementId, character, stats) {
        const el = document.getElementById(elementId);
        if (el) {
            el.innerHTML = this.render(character, stats);
        }
    }
};
