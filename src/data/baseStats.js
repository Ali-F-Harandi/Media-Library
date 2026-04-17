/**
 * Gen 1 Pokémon Base Stats
 * Format: { hp, atk, def, spe, spc }
 * Note: Gen 1 had only one Special stat (spc)
 */

export const GEN1_BASE_STATS = {
  0: { hp: 0, atk: 0, def: 0, spe: 0, spc: 0 },    // MissingNo
  1: { hp: 45, atk: 49, def: 49, spe: 45, spc: 65 }, // Bulbasaur
  2: { hp: 60, atk: 62, def: 63, spe: 60, spc: 80 }, // Ivysaur
  3: { hp: 80, atk: 82, def: 83, spe: 80, spc: 100 }, // Venusaur
  4: { hp: 39, atk: 52, def: 43, spe: 65, spc: 60 }, // Charmander
  5: { hp: 58, atk: 64, def: 58, spe: 80, spc: 80 }, // Charmeleon
  6: { hp: 78, atk: 84, def: 78, spe: 100, spc: 109 }, // Charizard
  7: { hp: 44, atk: 48, def: 65, spe: 43, spc: 50 }, // Squirtle
  8: { hp: 59, atk: 63, def: 80, spe: 58, spc: 65 }, // Wartortle
  9: { hp: 79, atk: 83, def: 100, spe: 78, spc: 85 }, // Blastoise
  10: { hp: 45, atk: 30, def: 35, spe: 45, spc: 20 }, // Caterpie
  11: { hp: 50, atk: 20, def: 55, spe: 30, spc: 25 }, // Metapod
  12: { hp: 60, atk: 45, def: 50, spe: 70, spc: 90 }, // Butterfree
  13: { hp: 40, atk: 35, def: 30, spe: 50, spc: 20 }, // Weedle
  14: { hp: 45, atk: 25, def: 50, spe: 35, spc: 25 }, // Kakuna
  15: { hp: 65, atk: 90, def: 40, spe: 75, spc: 45 }, // Beedrill
  16: { hp: 40, atk: 45, def: 40, spe: 56, spc: 35 }, // Pidgey
  17: { hp: 63, atk: 60, def: 55, spe: 71, spc: 50 }, // Pidgeotto
  18: { hp: 83, atk: 80, def: 75, spe: 101, spc: 70 }, // Pidgeot
  19: { hp: 30, atk: 56, def: 35, spe: 72, spc: 25 }, // Rattata
  20: { hp: 55, atk: 81, def: 60, spe: 97, spc: 50 }, // Raticate
  21: { hp: 35, atk: 60, def: 30, spe: 70, spc: 31 }, // Spearow
  22: { hp: 65, atk: 90, def: 65, spe: 100, spc: 61 }, // Fearow
  23: { hp: 35, atk: 60, def: 44, spe: 55, spc: 40 }, // Ekans
  24: { hp: 60, atk: 95, def: 69, spe: 80, spc: 65 }, // Arbok
  25: { hp: 35, atk: 55, def: 40, spe: 90, spc: 50 }, // Pikachu
  26: { hp: 60, atk: 90, def: 55, spe: 110, spc: 90 }, // Raichu
  27: { hp: 35, atk: 75, def: 85, spe: 65, spc: 30 }, // Sandshrew
  28: { hp: 75, atk: 100, def: 110, spe: 65, spc: 55 }, // Sandslash
  29: { hp: 55, atk: 47, def: 52, spe: 41, spc: 40 }, // Nidoran♀
  30: { hp: 70, atk: 62, def: 67, spe: 56, spc: 55 }, // Nidorina
  31: { hp: 90, atk: 92, def: 87, spe: 76, spc: 85 }, // Nidoqueen
  32: { hp: 46, atk: 57, def: 40, spe: 50, spc: 40 }, // Nidoran♂
  33: { hp: 61, atk: 72, def: 57, spe: 65, spc: 55 }, // Nidorino
  34: { hp: 81, atk: 102, def: 77, spe: 85, spc: 85 }, // Nidoking
  35: { hp: 70, atk: 45, def: 48, spe: 35, spc: 60 }, // Clefairy
  36: { hp: 95, atk: 70, def: 73, spe: 60, spc: 95 }, // Clefable
  37: { hp: 38, atk: 41, def: 40, spe: 65, spc: 65 }, // Vulpix
  38: { hp: 73, atk: 76, def: 75, spe: 100, spc: 100 }, // Ninetales
  39: { hp: 115, atk: 45, def: 20, spe: 20, spc: 45 }, // Jigglypuff
  40: { hp: 140, atk: 70, def: 45, spe: 45, spc: 75 }, // Wigglytuff
  41: { hp: 40, atk: 45, def: 35, spe: 55, spc: 40 }, // Zubat
  42: { hp: 75, atk: 80, def: 70, spe: 90, spc: 75 }, // Golbat
  43: { hp: 45, atk: 50, def: 55, spe: 30, spc: 75 }, // Oddish
  44: { hp: 60, atk: 65, def: 70, spe: 40, spc: 85 }, // Gloom
  45: { hp: 75, atk: 80, def: 85, spe: 50, spc: 110 }, // Vileplume
  46: { hp: 35, atk: 70, def: 55, spe: 25, spc: 55 }, // Paras
  47: { hp: 60, atk: 95, def: 80, spe: 30, spc: 80 }, // Parasect
  48: { hp: 60, atk: 55, def: 50, spe: 45, spc: 55 }, // Venonat
  49: { hp: 70, atk: 65, def: 60, spe: 90, spc: 90 }, // Venomoth
  50: { hp: 10, atk: 55, def: 25, spe: 95, spc: 45 }, // Diglett
  51: { hp: 35, atk: 100, def: 50, spe: 120, spc: 70 }, // Dugtrio
  52: { hp: 40, atk: 45, def: 35, spe: 90, spc: 40 }, // Meowth
  53: { hp: 65, atk: 70, def: 60, spe: 115, spc: 65 }, // Persian
  54: { hp: 50, atk: 52, def: 48, spe: 55, spc: 50 }, // Psyduck
  55: { hp: 80, atk: 82, def: 78, spe: 85, spc: 95 }, // Golduck
  56: { hp: 40, atk: 80, def: 35, spe: 70, spc: 35 }, // Mankey
  57: { hp: 65, atk: 105, def: 60, spe: 95, spc: 70 }, // Primeape
  58: { hp: 55, atk: 70, def: 45, spe: 60, spc: 50 }, // Growlithe
  59: { hp: 90, atk: 110, def: 80, spe: 95, spc: 100 }, // Arcanine
  60: { hp: 40, atk: 50, def: 40, spe: 90, spc: 40 }, // Poliwag
  61: { hp: 65, atk: 65, def: 65, spe: 90, spc: 50 }, // Poliwhirl
  62: { hp: 90, atk: 95, def: 95, spe: 70, spc: 70 }, // Poliwrath
  63: { hp: 25, atk: 20, def: 15, spe: 90, spc: 105 }, // Abra
  64: { hp: 40, atk: 35, def: 30, spe: 105, spc: 120 }, // Kadabra
  65: { hp: 55, atk: 50, def: 45, spe: 120, spc: 135 }, // Alakazam
  66: { hp: 70, atk: 80, def: 50, spe: 35, spc: 35 }, // Machop
  67: { hp: 80, atk: 100, def: 70, spe: 45, spc: 50 }, // Machoke
  68: { hp: 90, atk: 130, def: 80, spe: 55, spc: 65 }, // Machamp
  69: { hp: 50, atk: 75, def: 35, spe: 40, spc: 70 }, // Bellsprout
  70: { hp: 65, atk: 90, def: 50, spe: 55, spc: 85 }, // Weepinbell
  71: { hp: 80, atk: 105, def: 65, spe: 70, spc: 100 }, // Victreebel
  72: { hp: 35, atk: 40, def: 35, spe: 70, spc: 100 }, // Tentacool
  73: { hp: 80, atk: 70, def: 65, spe: 100, spc: 120 }, // Tentacruel
  74: { hp: 40, atk: 80, def: 100, spe: 20, spc: 30 }, // Geodude
  75: { hp: 55, atk: 95, def: 115, spe: 35, spc: 45 }, // Graveler
  76: { hp: 80, atk: 120, def: 130, spe: 45, spc: 55 }, // Golem
  77: { hp: 50, atk: 85, def: 55, spe: 90, spc: 65 }, // Ponyta
  78: { hp: 65, atk: 100, def: 70, spe: 105, spc: 80 }, // Rapidash
  79: { hp: 90, atk: 65, def: 65, spe: 15, spc: 70 }, // Slowpoke
  80: { hp: 95, atk: 75, def: 110, spe: 30, spc: 80 }, // Slowbro
  81: { hp: 25, atk: 35, def: 70, spe: 45, spc: 95 }, // Magnemite
  82: { hp: 50, atk: 60, def: 95, spe: 70, spc: 120 }, // Magneton
  83: { hp: 52, atk: 90, def: 51, spe: 60, spc: 58 }, // Farfetch'd
  84: { hp: 35, atk: 85, def: 45, spe: 75, spc: 35 }, // Doduo
  85: { hp: 60, atk: 110, def: 70, spe: 100, spc: 60 }, // Dodrio
  86: { hp: 90, atk: 70, def: 80, spe: 45, spc: 60 }, // Seel
  87: { hp: 110, atk: 85, def: 100, spe: 70, spc: 95 }, // Dewgong
  88: { hp: 80, atk: 80, def: 50, spe: 25, spc: 50 }, // Grimer
  89: { hp: 105, atk: 105, def: 75, spe: 50, spc: 65 }, // Muk
  90: { hp: 30, atk: 65, def: 100, spe: 40, spc: 45 }, // Shellder
  91: { hp: 50, atk: 95, def: 180, spe: 70, spc: 45 }, // Cloyster
  92: { hp: 30, atk: 35, def: 30, spe: 80, spc: 100 }, // Gastly
  93: { hp: 45, atk: 50, def: 45, spe: 95, spc: 115 }, // Haunter
  94: { hp: 60, atk: 65, def: 60, spe: 110, spc: 130 }, // Gengar
  95: { hp: 35, atk: 45, def: 160, spe: 70, spc: 45 }, // Onix
  96: { hp: 60, atk: 48, def: 45, spe: 42, spc: 90 }, // Drowzee
  97: { hp: 85, atk: 73, def: 70, spe: 67, spc: 115 }, // Hypno
  98: { hp: 30, atk: 105, def: 90, spe: 50, spc: 25 }, // Krabby
  99: { hp: 55, atk: 130, def: 115, spe: 75, spc: 50 }, // Kingler
  100: { hp: 40, atk: 30, def: 50, spe: 100, spc: 55 }, // Voltorb
  101: { hp: 60, atk: 50, def: 70, spe: 150, spc: 80 }, // Electrode
  102: { hp: 60, atk: 40, def: 80, spe: 40, spc: 60 }, // Exeggcute
  103: { hp: 95, atk: 95, def: 85, spe: 55, spc: 125 }, // Exeggutor
  104: { hp: 50, atk: 50, def: 95, spe: 35, spc: 45 }, // Cubone
  105: { hp: 60, atk: 80, def: 110, spe: 45, spc: 50 }, // Marowak
  106: { hp: 50, atk: 120, def: 53, spe: 87, spc: 35 }, // Hitmonlee
  107: { hp: 50, atk: 105, def: 79, spe: 76, spc: 35 }, // Hitmonchan
  108: { hp: 90, atk: 55, def: 75, spe: 30, spc: 60 }, // Lickitung
  109: { hp: 40, atk: 65, def: 95, spe: 35, spc: 60 }, // Koffing
  110: { hp: 65, atk: 90, def: 120, spe: 60, spc: 85 }, // Weezing
  111: { hp: 80, atk: 85, def: 95, spe: 25, spc: 30 }, // Rhyhorn
  112: { hp: 105, atk: 130, def: 120, spe: 40, spc: 45 }, // Rhydon
  113: { hp: 250, atk: 5, def: 5, spe: 50, spc: 105 }, // Chansey
  114: { hp: 65, atk: 55, def: 115, spe: 60, spc: 40 }, // Tangela
  115: { hp: 105, atk: 95, def: 80, spe: 90, spc: 80 }, // Kangaskhan
  116: { hp: 30, atk: 40, def: 70, spe: 60, spc: 70 }, // Horsea
  117: { hp: 55, atk: 65, def: 95, spe: 85, spc: 95 }, // Seadra
  118: { hp: 45, atk: 67, def: 60, spe: 63, spc: 50 }, // Goldeen
  119: { hp: 80, atk: 92, def: 65, spe: 68, spc: 80 }, // Seaking
  120: { hp: 30, atk: 45, def: 55, spe: 85, spc: 70 }, // Staryu
  121: { hp: 60, atk: 75, def: 85, spe: 115, spc: 100 }, // Starmie
  122: { hp: 40, atk: 45, def: 65, spe: 90, spc: 100 }, // Mr. Mime
  123: { hp: 70, atk: 110, def: 80, spe: 105, spc: 55 }, // Scyther
  124: { hp: 65, atk: 50, def: 35, spe: 95, spc: 95 }, // Jynx
  125: { hp: 65, atk: 83, def: 57, spe: 105, spc: 95 }, // Electabuzz
  126: { hp: 65, atk: 95, def: 57, spe: 93, spc: 100 }, // Magmar
  127: { hp: 65, atk: 125, def: 100, spe: 85, spc: 55 }, // Pinsir
  128: { hp: 75, atk: 100, def: 95, spe: 110, spc: 80 }, // Tauros
  129: { hp: 20, atk: 10, def: 55, spe: 80, spc: 15 }, // Magikarp
  130: { hp: 95, atk: 125, def: 79, spe: 81, spc: 100 }, // Gyarados
  131: { hp: 130, atk: 85, def: 80, spe: 60, spc: 95 }, // Lapras
  132: { hp: 48, atk: 48, def: 48, spe: 48, spc: 48 }, // Ditto
  133: { hp: 55, atk: 55, def: 50, spe: 55, spc: 65 }, // Eevee
  134: { hp: 130, atk: 65, def: 60, spe: 65, spc: 110 }, // Vaporeon
  135: { hp: 65, atk: 65, def: 60, spe: 130, spc: 95 }, // Jolteon
  136: { hp: 65, atk: 130, def: 60, spe: 65, spc: 95 }, // Flareon
  137: { hp: 65, atk: 60, def: 70, spe: 40, spc: 75 }, // Porygon
  138: { hp: 35, atk: 40, def: 100, spe: 35, spc: 90 }, // Omanyte
  139: { hp: 55, atk: 60, def: 125, spe: 55, spc: 115 }, // Omastar
  140: { hp: 30, atk: 80, def: 90, spe: 55, spc: 55 }, // Kabuto
  141: { hp: 60, atk: 115, def: 105, spe: 80, spc: 70 }, // Kabutops
  142: { hp: 80, atk: 105, def: 65, spe: 130, spc: 60 }, // Aerodactyl
  143: { hp: 160, atk: 110, def: 65, spe: 30, spc: 110 }, // Snorlax
  144: { hp: 90, atk: 85, def: 100, spe: 85, spc: 125 }, // Articuno
  145: { hp: 90, atk: 90, def: 85, spe: 100, spc: 125 }, // Zapdos
  146: { hp: 90, atk: 100, def: 90, spe: 90, spc: 125 }, // Moltres
  147: { hp: 41, atk: 64, def: 45, spe: 50, spc: 50 }, // Dratini
  148: { hp: 61, atk: 84, def: 65, spe: 70, spc: 70 }, // Dragonair
  149: { hp: 91, atk: 134, def: 95, spe: 80, spc: 100 }, // Dragonite
  150: { hp: 106, atk: 110, def: 90, spe: 130, spc: 154 }, // Mewtwo
  151: { hp: 100, atk: 100, def: 100, spe: 100, spc: 100 } // Mew
};

/**
 * Get base stats for a Pokémon by National Dex ID
 */
export function getBaseStats(dexId) {
  return GEN1_BASE_STATS[dexId] || GEN1_BASE_STATS[0];
}
