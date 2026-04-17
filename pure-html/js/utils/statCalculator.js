/**
 * Stat Calculator for Gen 1 Pokémon
 * Gen 1 uses different stat formulas than later generations
 */

/**
 * Calculate a Gen 1 stat (HP or non-HP)
 *
 * HP Formula: floor(((base + iv) * 2 + floor(sqrt(ev) / 4)) * level / 100) + level + 10
 * Other Stats: floor(((base + iv) * 2 + floor(sqrt(ev) / 4)) * level / 100) + 5
 */
function calculateGen1Stat(baseStat, iv, ev, level, isHp = false) {
    // Gen 1 EVs are stored as actual stat experience (0-65535)
    const evBonus = Math.floor(Math.sqrt(ev) / 4);

    // Calculate the base stat contribution
    const statValue = ((baseStat + iv) * 2 + evBonus) * level;
    const statFloor = Math.floor(statValue / 100);

    if (isHp) {
        // HP formula
        return statFloor + level + 10;
    } else {
        // Other stats formula
        return statFloor + 5;
    }
}

/**
 * Calculate all stats for a Gen 1 Pokémon
 */
function calculateAllGen1Stats(baseStats, ivs, evs, level) {
    return {
        hp: calculateGen1Stat(baseStats.hp, ivs.hp, evs.hp, level, true),
        attack: calculateGen1Stat(baseStats.atk, ivs.attack, evs.attack, level, false),
        defense: calculateGen1Stat(baseStats.def, ivs.defense, evs.defense, level, false),
        speed: calculateGen1Stat(baseStats.spe, ivs.speed, evs.speed, level, false),
        special: calculateGen1Stat(baseStats.spc, ivs.special, evs.special, level, false)
    };
}

// Make available globally
window.calculateGen1Stat = calculateGen1Stat;
window.calculateAllGen1Stats = calculateAllGen1Stats;
