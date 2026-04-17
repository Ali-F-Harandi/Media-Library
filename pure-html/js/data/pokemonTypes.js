/**
 * Gen 1 Pokémon Types
 */

// Type IDs used in Gen 1
const TYPE_IDS = {
    NORMAL: 0,
    FIGHTING: 1,
    FLYING: 2,
    POISON: 3,
    GROUND: 4,
    ROCK: 5,
    BUG: 6,
    GHOST: 7,
    FIRE: 8,
    WATER: 9,
    GRASS: 10,
    ELECTRIC: 11,
    PSYCHIC: 12,
    ICE: 13,
    DRAGON: 14
};

// Type names for Gen 1 (15 types, no Dark/Steel)
const TYPE_NAMES = [
    'Normal', 'Fighting', 'Flying', 'Poison', 'Ground',
    'Rock', 'Bug', 'Ghost', 'Fire', 'Water',
    'Grass', 'Electric', 'Psychic', 'Ice', 'Dragon'
];

/**
 * Get type name by ID
 */
function getTypeName(typeId) {
    if (typeId < 0 || typeId >= TYPE_NAMES.length) {
        return 'Normal';
    }
    return TYPE_NAMES[typeId] || 'Normal';
}

/**
 * Get types for a Pokémon by National Dex ID
 */
function getPokemonTypes(dexId) {
    const pokemonTypes = {
        1: [TYPE_IDS.GRASS, TYPE_IDS.POISON],
        2: [TYPE_IDS.GRASS, TYPE_IDS.POISON],
        3: [TYPE_IDS.GRASS, TYPE_IDS.POISON],
        4: [TYPE_IDS.FIRE],
        5: [TYPE_IDS.FIRE],
        6: [TYPE_IDS.FIRE, TYPE_IDS.FLYING],
        7: [TYPE_IDS.WATER],
        8: [TYPE_IDS.WATER],
        9: [TYPE_IDS.WATER],
        10: [TYPE_IDS.BUG],
        11: [TYPE_IDS.BUG],
        12: [TYPE_IDS.BUG, TYPE_IDS.FLYING],
        13: [TYPE_IDS.BUG, TYPE_IDS.POISON],
        14: [TYPE_IDS.BUG, TYPE_IDS.POISON],
        15: [TYPE_IDS.BUG, TYPE_IDS.POISON],
        16: [TYPE_IDS.NORMAL, TYPE_IDS.FLYING],
        17: [TYPE_IDS.NORMAL, TYPE_IDS.FLYING],
        18: [TYPE_IDS.NORMAL, TYPE_IDS.FLYING],
        19: [TYPE_IDS.NORMAL],
        20: [TYPE_IDS.NORMAL],
        21: [TYPE_IDS.NORMAL, TYPE_IDS.FLYING],
        22: [TYPE_IDS.NORMAL, TYPE_IDS.FLYING],
        23: [TYPE_IDS.POISON],
        24: [TYPE_IDS.POISON],
        25: [TYPE_IDS.ELECTRIC],
        26: [TYPE_IDS.ELECTRIC],
        27: [TYPE_IDS.GROUND],
        28: [TYPE_IDS.GROUND],
        29: [TYPE_IDS.POISON],
        30: [TYPE_IDS.POISON],
        31: [TYPE_IDS.POISON, TYPE_IDS.GROUND],
        32: [TYPE_IDS.POISON],
        33: [TYPE_IDS.POISON],
        34: [TYPE_IDS.POISON, TYPE_IDS.GROUND],
        35: [TYPE_IDS.NORMAL],
        36: [TYPE_IDS.NORMAL],
        37: [TYPE_IDS.FIRE],
        38: [TYPE_IDS.FIRE],
        39: [TYPE_IDS.NORMAL],
        40: [TYPE_IDS.NORMAL],
        41: [TYPE_IDS.POISON, TYPE_IDS.FLYING],
        42: [TYPE_IDS.POISON, TYPE_IDS.FLYING],
        43: [TYPE_IDS.GRASS, TYPE_IDS.POISON],
        44: [TYPE_IDS.GRASS, TYPE_IDS.POISON],
        45: [TYPE_IDS.GRASS, TYPE_IDS.POISON],
        46: [TYPE_IDS.BUG, TYPE_IDS.GRASS],
        47: [TYPE_IDS.BUG, TYPE_IDS.GRASS],
        48: [TYPE_IDS.BUG, TYPE_IDS.POISON],
        49: [TYPE_IDS.BUG, TYPE_IDS.POISON],
        50: [TYPE_IDS.GROUND],
        51: [TYPE_IDS.GROUND],
        52: [TYPE_IDS.NORMAL],
        53: [TYPE_IDS.NORMAL],
        54: [TYPE_IDS.WATER],
        55: [TYPE_IDS.WATER],
        56: [TYPE_IDS.FIGHTING],
        57: [TYPE_IDS.FIGHTING],
        58: [TYPE_IDS.FIRE],
        59: [TYPE_IDS.FIRE],
        60: [TYPE_IDS.WATER],
        61: [TYPE_IDS.WATER],
        62: [TYPE_IDS.WATER, TYPE_IDS.FIGHTING],
        63: [TYPE_IDS.PSYCHIC],
        64: [TYPE_IDS.PSYCHIC],
        65: [TYPE_IDS.PSYCHIC],
        66: [TYPE_IDS.FIGHTING],
        67: [TYPE_IDS.FIGHTING],
        68: [TYPE_IDS.FIGHTING],
        69: [TYPE_IDS.GRASS, TYPE_IDS.POISON],
        70: [TYPE_IDS.GRASS, TYPE_IDS.POISON],
        71: [TYPE_IDS.GRASS, TYPE_IDS.POISON],
        72: [TYPE_IDS.WATER, TYPE_IDS.POISON],
        73: [TYPE_IDS.WATER, TYPE_IDS.POISON],
        74: [TYPE_IDS.ROCK, TYPE_IDS.GROUND],
        75: [TYPE_IDS.ROCK, TYPE_IDS.GROUND],
        76: [TYPE_IDS.ROCK, TYPE_IDS.GROUND],
        77: [TYPE_IDS.FIRE],
        78: [TYPE_IDS.FIRE],
        79: [TYPE_IDS.WATER, TYPE_IDS.PSYCHIC],
        80: [TYPE_IDS.WATER, TYPE_IDS.PSYCHIC],
        81: [TYPE_IDS.ELECTRIC],
        82: [TYPE_IDS.ELECTRIC],
        83: [TYPE_IDS.NORMAL, TYPE_IDS.FLYING],
        84: [TYPE_IDS.NORMAL, TYPE_IDS.FLYING],
        85: [TYPE_IDS.NORMAL, TYPE_IDS.FLYING],
        86: [TYPE_IDS.WATER],
        87: [TYPE_IDS.WATER, TYPE_IDS.ICE],
        88: [TYPE_IDS.POISON],
        89: [TYPE_IDS.POISON],
        90: [TYPE_IDS.WATER],
        91: [TYPE_IDS.WATER, TYPE_IDS.ICE],
        92: [TYPE_IDS.GHOST, TYPE_IDS.POISON],
        93: [TYPE_IDS.GHOST, TYPE_IDS.POISON],
        94: [TYPE_IDS.GHOST, TYPE_IDS.POISON],
        95: [TYPE_IDS.ROCK, TYPE_IDS.GROUND],
        96: [TYPE_IDS.PSYCHIC],
        97: [TYPE_IDS.PSYCHIC],
        98: [TYPE_IDS.WATER],
        99: [TYPE_IDS.WATER],
        100: [TYPE_IDS.ELECTRIC],
        101: [TYPE_IDS.ELECTRIC],
        102: [TYPE_IDS.GRASS, TYPE_IDS.PSYCHIC],
        103: [TYPE_IDS.GRASS, TYPE_IDS.PSYCHIC],
        104: [TYPE_IDS.GROUND],
        105: [TYPE_IDS.GROUND],
        106: [TYPE_IDS.FIGHTING],
        107: [TYPE_IDS.FIGHTING],
        108: [TYPE_IDS.NORMAL],
        109: [TYPE_IDS.POISON],
        110: [TYPE_IDS.POISON],
        111: [TYPE_IDS.GROUND, TYPE_IDS.ROCK],
        112: [TYPE_IDS.GROUND, TYPE_IDS.ROCK],
        113: [TYPE_IDS.NORMAL],
        114: [TYPE_IDS.GRASS],
        115: [TYPE_IDS.NORMAL],
        116: [TYPE_IDS.WATER],
        117: [TYPE_IDS.WATER],
        118: [TYPE_IDS.WATER],
        119: [TYPE_IDS.WATER],
        120: [TYPE_IDS.WATER],
        121: [TYPE_IDS.WATER, TYPE_IDS.PSYCHIC],
        122: [TYPE_IDS.PSYCHIC],
        123: [TYPE_IDS.BUG, TYPE_IDS.FLYING],
        124: [TYPE_IDS.ICE, TYPE_IDS.PSYCHIC],
        125: [TYPE_IDS.ELECTRIC],
        126: [TYPE_IDS.FIRE],
        127: [TYPE_IDS.BUG],
        128: [TYPE_IDS.NORMAL],
        129: [TYPE_IDS.WATER],
        130: [TYPE_IDS.WATER, TYPE_IDS.FLYING],
        131: [TYPE_IDS.WATER, TYPE_IDS.ICE],
        132: [TYPE_IDS.NORMAL],
        133: [TYPE_IDS.NORMAL],
        134: [TYPE_IDS.WATER],
        135: [TYPE_IDS.ELECTRIC],
        136: [TYPE_IDS.FIRE],
        137: [TYPE_IDS.NORMAL],
        138: [TYPE_IDS.ROCK, TYPE_IDS.WATER],
        139: [TYPE_IDS.ROCK, TYPE_IDS.WATER],
        140: [TYPE_IDS.ROCK, TYPE_IDS.WATER],
        141: [TYPE_IDS.ROCK, TYPE_IDS.WATER],
        142: [TYPE_IDS.ROCK, TYPE_IDS.FLYING],
        143: [TYPE_IDS.NORMAL],
        144: [TYPE_IDS.ICE, TYPE_IDS.FLYING],
        145: [TYPE_IDS.ELECTRIC, TYPE_IDS.FLYING],
        146: [TYPE_IDS.FIRE, TYPE_IDS.FLYING],
        147: [TYPE_IDS.DRAGON],
        148: [TYPE_IDS.DRAGON],
        149: [TYPE_IDS.DRAGON, TYPE_IDS.FLYING],
        150: [TYPE_IDS.PSYCHIC],
        151: [TYPE_IDS.PSYCHIC]
    };

    const types = pokemonTypes[dexId] || [TYPE_IDS.NORMAL];
    return types.map(typeId => getTypeName(typeId));
}

// Make available globally
window.TYPE_IDS = TYPE_IDS;
window.TYPE_NAMES = TYPE_NAMES;
window.getTypeName = getTypeName;
window.getPokemonTypes = getPokemonTypes;
