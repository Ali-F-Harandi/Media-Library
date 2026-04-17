/**
 * Gen 1 Pokémon Types
 */

// Type IDs used in Gen 1
export const TYPE_IDS = {
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
export const TYPE_NAMES = [
  'Normal', 'Fighting', 'Flying', 'Poison', 'Ground', 
  'Rock', 'Bug', 'Ghost', 'Fire', 'Water', 
  'Grass', 'Electric', 'Psychic', 'Ice', 'Dragon'
];

/**
 * Get type name by ID
 */
export function getTypeName(typeId) {
  if (typeId < 0 || typeId >= TYPE_NAMES.length) {
    return 'Normal';
  }
  return TYPE_NAMES[typeId] || 'Normal';
}

/**
 * Get types for a Pokémon by National Dex ID
 * Returns array of 1 or 2 types
 */
export function getPokemonTypes(dexId) {
  // Gen 1 Pokémon type assignments
  const pokemonTypes = {
    1: [TYPE_IDS.GRASS, TYPE_IDS.POISON],    // Bulbasaur
    2: [TYPE_IDS.GRASS, TYPE_IDS.POISON],    // Ivysaur
    3: [TYPE_IDS.GRASS, TYPE_IDS.POISON],    // Venusaur
    4: [TYPE_IDS.FIRE],                       // Charmander
    5: [TYPE_IDS.FIRE],                       // Charmeleon
    6: [TYPE_IDS.FIRE, TYPE_IDS.FLYING],     // Charizard
    7: [TYPE_IDS.WATER],                      // Squirtle
    8: [TYPE_IDS.WATER],                      // Wartortle
    9: [TYPE_IDS.WATER],                      // Blastoise
    10: [TYPE_IDS.BUG],                       // Caterpie
    11: [TYPE_IDS.BUG],                       // Metapod
    12: [TYPE_IDS.BUG, TYPE_IDS.FLYING],     // Butterfree
    13: [TYPE_IDS.BUG, TYPE_IDS.POISON],     // Weedle
    14: [TYPE_IDS.BUG, TYPE_IDS.POISON],     // Kakuna
    15: [TYPE_IDS.BUG, TYPE_IDS.POISON],     // Beedrill
    16: [TYPE_IDS.NORMAL, TYPE_IDS.FLYING],  // Pidgey
    17: [TYPE_IDS.NORMAL, TYPE_IDS.FLYING],  // Pidgeotto
    18: [TYPE_IDS.NORMAL, TYPE_IDS.FLYING],  // Pidgeot
    19: [TYPE_IDS.NORMAL],                    // Rattata
    20: [TYPE_IDS.NORMAL],                    // Raticate
    21: [TYPE_IDS.NORMAL, TYPE_IDS.FLYING],  // Spearow
    22: [TYPE_IDS.NORMAL, TYPE_IDS.FLYING],  // Fearow
    23: [TYPE_IDS.POISON],                    // Ekans
    24: [TYPE_IDS.POISON],                    // Arbok
    25: [TYPE_IDS.ELECTRIC],                  // Pikachu
    26: [TYPE_IDS.ELECTRIC],                  // Raichu
    27: [TYPE_IDS.GROUND],                    // Sandshrew
    28: [TYPE_IDS.GROUND],                    // Sandslash
    29: [TYPE_IDS.POISON],                    // Nidoran♀
    30: [TYPE_IDS.POISON],                    // Nidorina
    31: [TYPE_IDS.POISON, TYPE_IDS.GROUND],  // Nidoqueen
    32: [TYPE_IDS.POISON],                    // Nidoran♂
    33: [TYPE_IDS.POISON],                    // Nidorino
    34: [TYPE_IDS.POISON, TYPE_IDS.GROUND],  // Nidoking
    35: [TYPE_IDS.NORMAL],                    // Clefairy
    36: [TYPE_IDS.NORMAL],                    // Clefable
    37: [TYPE_IDS.FIRE],                      // Vulpix
    38: [TYPE_IDS.FIRE],                      // Ninetales
    39: [TYPE_IDS.NORMAL],                    // Jigglypuff
    40: [TYPE_IDS.NORMAL],                    // Wigglytuff
    41: [TYPE_IDS.POISON, TYPE_IDS.FLYING],  // Zubat
    42: [TYPE_IDS.POISON, TYPE_IDS.FLYING],  // Golbat
    43: [TYPE_IDS.GRASS, TYPE_IDS.POISON],   // Oddish
    44: [TYPE_IDS.GRASS, TYPE_IDS.POISON],   // Gloom
    45: [TYPE_IDS.GRASS, TYPE_IDS.POISON],   // Vileplume
    46: [TYPE_IDS.BUG, TYPE_IDS.GRASS],      // Paras
    47: [TYPE_IDS.BUG, TYPE_IDS.GRASS],      // Parasect
    48: [TYPE_IDS.BUG, TYPE_IDS.POISON],     // Venonat
    49: [TYPE_IDS.BUG, TYPE_IDS.POISON],     // Venomoth
    50: [TYPE_IDS.GROUND],                    // Diglett
    51: [TYPE_IDS.GROUND],                    // Dugtrio
    52: [TYPE_IDS.NORMAL],                    // Meowth
    53: [TYPE_IDS.NORMAL],                    // Persian
    54: [TYPE_IDS.WATER],                     // Psyduck
    55: [TYPE_IDS.WATER],                     // Golduck
    56: [TYPE_IDS.FIGHTING],                  // Mankey
    57: [TYPE_IDS.FIGHTING],                  // Primeape
    58: [TYPE_IDS.FIRE],                      // Growlithe
    59: [TYPE_IDS.FIRE],                      // Arcanine
    60: [TYPE_IDS.WATER],                     // Poliwag
    61: [TYPE_IDS.WATER],                     // Poliwhirl
    62: [TYPE_IDS.WATER, TYPE_IDS.FIGHTING], // Poliwrath
    63: [TYPE_IDS.PSYCHIC],                   // Abra
    64: [TYPE_IDS.PSYCHIC],                   // Kadabra
    65: [TYPE_IDS.PSYCHIC],                   // Alakazam
    66: [TYPE_IDS.FIGHTING],                  // Machop
    67: [TYPE_IDS.FIGHTING],                  // Machoke
    68: [TYPE_IDS.FIGHTING],                  // Machamp
    69: [TYPE_IDS.GRASS, TYPE_IDS.POISON],   // Bellsprout
    70: [TYPE_IDS.GRASS, TYPE_IDS.POISON],   // Weepinbell
    71: [TYPE_IDS.GRASS, TYPE_IDS.POISON],   // Victreebel
    72: [TYPE_IDS.WATER, TYPE_IDS.POISON],   // Tentacool
    73: [TYPE_IDS.WATER, TYPE_IDS.POISON],   // Tentacruel
    74: [TYPE_IDS.ROCK, TYPE_IDS.GROUND],    // Geodude
    75: [TYPE_IDS.ROCK, TYPE_IDS.GROUND],    // Graveler
    76: [TYPE_IDS.ROCK, TYPE_IDS.GROUND],    // Golem
    77: [TYPE_IDS.FIRE],                      // Ponyta
    78: [TYPE_IDS.FIRE],                      // Rapidash
    79: [TYPE_IDS.WATER, TYPE_IDS.PSYCHIC],  // Slowpoke
    80: [TYPE_IDS.WATER, TYPE_IDS.PSYCHIC],  // Slowbro
    81: [TYPE_IDS.ELECTRIC, TYPE_IDS.STEEL], // Magnemite (Steel added later, but Electric only in Gen 1)
    82: [TYPE_IDS.ELECTRIC],                  // Magneton
    83: [TYPE_IDS.NORMAL, TYPE_IDS.FLYING],  // Farfetch'd
    84: [TYPE_IDS.NORMAL, TYPE_IDS.FLYING],  // Doduo
    85: [TYPE_IDS.NORMAL, TYPE_IDS.FLYING],  // Dodrio
    86: [TYPE_IDS.WATER],                     // Seel
    87: [TYPE_IDS.WATER, TYPE_IDS.ICE],      // Dewgong
    88: [TYPE_IDS.POISON],                    // Grimer
    89: [TYPE_IDS.POISON],                    // Muk
    90: [TYPE_IDS.WATER],                     // Shellder
    91: [TYPE_IDS.WATER, TYPE_IDS.ICE],      // Cloyster
    92: [TYPE_IDS.GHOST, TYPE_IDS.POISON],   // Gastly
    93: [TYPE_IDS.GHOST, TYPE_IDS.POISON],   // Haunter
    94: [TYPE_IDS.GHOST, TYPE_IDS.POISON],   // Gengar
    95: [TYPE_IDS.ROCK, TYPE_IDS.GROUND],    // Onix
    96: [TYPE_IDS.PSYCHIC],                   // Drowzee
    97: [TYPE_IDS.PSYCHIC],                   // Hypno
    98: [TYPE_IDS.WATER],                     // Krabby
    99: [TYPE_IDS.WATER],                     // Kingler
    100: [TYPE_IDS.ELECTRIC],                 // Voltorb
    101: [TYPE_IDS.ELECTRIC],                 // Electrode
    102: [TYPE_IDS.GRASS, TYPE_IDS.PSYCHIC], // Exeggcute
    103: [TYPE_IDS.GRASS, TYPE_IDS.PSYCHIC], // Exeggutor
    104: [TYPE_IDS.GROUND],                   // Cubone
    105: [TYPE_IDS.GROUND],                   // Marowak
    106: [TYPE_IDS.FIGHTING],                 // Hitmonlee
    107: [TYPE_IDS.FIGHTING],                 // Hitmonchan
    108: [TYPE_IDS.NORMAL],                   // Lickitung
    109: [TYPE_IDS.POISON],                   // Koffing
    110: [TYPE_IDS.POISON],                   // Weezing
    111: [TYPE_IDS.GROUND, TYPE_IDS.ROCK],   // Rhyhorn
    112: [TYPE_IDS.GROUND, TYPE_IDS.ROCK],   // Rhydon
    113: [TYPE_IDS.NORMAL],                   // Chansey
    114: [TYPE_IDS.GRASS],                    // Tangela
    115: [TYPE_IDS.NORMAL],                   // Kangaskhan
    116: [TYPE_IDS.WATER],                    // Horsea
    117: [TYPE_IDS.WATER],                    // Seadra
    118: [TYPE_IDS.WATER],                    // Goldeen
    119: [TYPE_IDS.WATER],                    // Seaking
    120: [TYPE_IDS.WATER],                    // Staryu
    121: [TYPE_IDS.WATER, TYPE_IDS.PSYCHIC], // Starmie
    122: [TYPE_IDS.PSYCHIC],                  // Mr. Mime
    123: [TYPE_IDS.BUG, TYPE_IDS.FLYING],    // Scyther
    124: [TYPE_IDS.ICE, TYPE_IDS.PSYCHIC],   // Jynx
    125: [TYPE_IDS.ELECTRIC],                 // Electabuzz
    126: [TYPE_IDS.FIRE],                     // Magmar
    127: [TYPE_IDS.BUG],                      // Pinsir
    128: [TYPE_IDS.NORMAL],                   // Tauros
    129: [TYPE_IDS.WATER],                    // Magikarp
    130: [TYPE_IDS.WATER, TYPE_IDS.FLYING],  // Gyarados
    131: [TYPE_IDS.WATER, TYPE_IDS.ICE],     // Lapras
    132: [TYPE_IDS.NORMAL],                   // Ditto
    133: [TYPE_IDS.NORMAL],                   // Eevee
    134: [TYPE_IDS.WATER],                    // Vaporeon
    135: [TYPE_IDS.ELECTRIC],                 // Jolteon
    136: [TYPE_IDS.FIRE],                     // Flareon
    137: [TYPE_IDS.NORMAL],                   // Porygon
    138: [TYPE_IDS.ROCK, TYPE_IDS.WATER],    // Omanyte
    139: [TYPE_IDS.ROCK, TYPE_IDS.WATER],    // Omastar
    140: [TYPE_IDS.ROCK, TYPE_IDS.WATER],    // Kabuto
    141: [TYPE_IDS.ROCK, TYPE_IDS.WATER],    // Kabutops
    142: [TYPE_IDS.ROCK, TYPE_IDS.FLYING],   // Aerodactyl
    143: [TYPE_IDS.NORMAL],                   // Snorlax
    144: [TYPE_IDS.ICE, TYPE_IDS.FLYING],    // Articuno
    145: [TYPE_IDS.ELECTRIC, TYPE_IDS.FLYING], // Zapdos
    146: [TYPE_IDS.FIRE, TYPE_IDS.FLYING],   // Moltres
    147: [TYPE_IDS.DRAGON],                   // Dratini
    148: [TYPE_IDS.DRAGON],                   // Dragonair
    149: [TYPE_IDS.DRAGON, TYPE_IDS.FLYING], // Dragonite
    150: [TYPE_IDS.PSYCHIC],                  // Mewtwo
    151: [TYPE_IDS.PSYCHIC]                   // Mew
  };

  const types = pokemonTypes[dexId] || [TYPE_IDS.NORMAL];
  return types.map(typeId => getTypeName(typeId));
}
