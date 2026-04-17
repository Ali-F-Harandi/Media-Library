/**
 * Stat Calculator for Gen 1 Pokémon
 * Gen 1 uses different stat formulas than later generations
 */

/**
 * Calculate a Gen 1 stat (HP or non-HP)
 * 
 * HP Formula: floor(((base + iv) * 2 + floor(sqrt(ev) / 4)) * level / 100) + level + 10
 * Other Stats: floor(((base + iv) * 2 + floor(sqrt(ev) / 4)) * level / 100) + 5
 * 
 * @param {number} baseStat - Base stat value
 * @param {number} iv - Individual Value (0-15 in Gen 1)
 * @param {number} ev - Effort Value (0-65535 in Gen 1)
 * @param {number} level - Pokémon level (1-100)
 * @param {boolean} isHp - Whether this is the HP stat
 * @returns {number} Calculated stat value
 */
export function calculateGen1Stat(baseStat, iv, ev, level, isHp = false) {
  // Gen 1 EVs are stored as actual stat experience (0-65535)
  // But we need to convert them for the formula
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
export function calculateAllGen1Stats(baseStats, ivs, evs, level) {
  return {
    hp: calculateGen1Stat(baseStats.hp, ivs.hp, evs.hp, level, true),
    attack: calculateGen1Stat(baseStats.atk, ivs.attack, evs.attack, level, false),
    defense: calculateGen1Stat(baseStats.def, ivs.defense, evs.defense, level, false),
    speed: calculateGen1Stat(baseStats.spe, ivs.speed, evs.speed, level, false),
    special: calculateGen1Stat(baseStats.spc, ivs.special, evs.special, level, false)
  };
}

/**
 * Calculate IV from Gen 1 stat experience
 * In Gen 1, IVs are derived from the last two bits of the stat experience
 */
export function calculateIVFromStatExp(statExp) {
  // IV = (statExp % 4) * 4 + (statExp % 4)
  // Actually, IV is just the last 4 bits when properly extracted
  return statExp & 0xF;
}

/**
 * Calculate the hidden Power type and power from Gen 1 IVs
 * Note: Hidden Power didn't exist in Gen 1, but we can calculate what it would be
 */
export function calculateHiddenPower(ivs) {
  const { attack, defense, speed, special } = ivs;
  
  // Type calculation (not applicable in Gen 1, but for reference)
  const typeIndex = Math.floor(
    ((attack % 2) + 2 * (defense % 2) + 4 * (speed % 2) + 8 * (special % 2)) * 15 / 15
  );
  
  // Power calculation (not applicable in Gen 1)
  const power = Math.floor(
    ((attack >> 1) + (defense >> 1) + (speed >> 1) + (special >> 1)) * 40 / 63
  ) + 30;
  
  return { typeIndex, power };
}
