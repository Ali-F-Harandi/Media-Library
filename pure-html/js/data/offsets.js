/**
 * Gen 1 Save File Offsets and Constants
 * Pokémon Red/Blue/Yellow save file structure
 */

// Main save data offsets (relative to save slot start)
const GEN1_OFFSETS = {
  // Player Info
  PLAYER_NAME: 0x2598,        // 11 bytes
  RIVAL_NAME: 0x25A3,         // 11 bytes
  PLAYER_ID: 0x25A4,          // 2 bytes
  MONEY: 0x25F6,              // 3 bytes (BCD encoded)
  CASINO_COINS: 0x25F9,       // 2 bytes (BCD encoded)
  PLAY_TIME: 0x25FB,          // Hours, then minutes (separate bytes)
  BADGES: 0x25E9,             // 1 byte (bit flags)
  
  // Game Options
  OPTIONS: 0x25ED,            // 1 byte
  
  // Pikachu Friendship (Yellow version only)
  PIKACHU_FRIENDSHIP: 0x2722,
  
  // Starter Pokémon
  PLAYER_STARTER: 0x2723,
  RIVAL_STARTER: 0x2724,
  
  // Current Map/Location
  CURRENT_MAP: 0x2601,
  X_COORD: 0x2602,
  Y_COORD: 0x2603,
  LAST_MAP: 0x2604,
  WARPED_FROM_MAP: 0x2605,
  
  // Party Data
  PARTY_DATA: 0x2F2D,         // Party count (1 byte)
  PARTY_MON_SIZE: 44,         // Size of each party Pokémon struct
  
  // PC Box Data
  CURRENT_BOX_ID: 0x2FE2,     // Current box number (0-11)
  CURRENT_BOX_DATA: 0x2FE3,   // Current box Pokémon count + data
  BOX_MON_SIZE: 33,           // Size of each box Pokémon struct
  PC_BANK_2_START: 0x30C4,    // Boxes 0-5
  PC_BANK_3_START: 0x3FA4,    // Boxes 6-11
  BOX_STRUCT_SIZE: 0x234,     // Size of each box structure
  
  // Items
  ITEM_BAG: 0x272D,           // Bag items (max 20)
  PC_ITEMS: 0x2768,           // PC items (max 50)
  
  // Pokédex
  POKEDEX_OWNED: 0x2844,      // Owned flags (19 bytes = 152 bits)
  POKEDEX_SEEN: 0x2857,       // Seen flags (19 bytes = 152 bits)
  
  // Missable Objects / Event Flags
  MISSABLE_OBJECTS: 0x286A,   // 32 bytes = 256 event flags
  
  // Daycare
  DAYCARE_IN_USE: 0x29C4,
  DAYCARE_MON: 0x29C5,
  DAYCARE_NAME: 0x29E3,       // 11 bytes
  DAYCARE_OT: 0x29EE,         // 11 bytes
  
  // Hall of Fame
  HALL_OF_FAME: 0x0598,
  
  // Checksum
  CHECKSUM: 0x3523,
};

// Internal Pokémon ID to National Dex mapping for Gen 1
const GEN1_INTERNAL_TO_DEX = {
  0x01: 0,    // MissingNo
  0x02: 1,    // Bulbasaur
  0x03: 2,    // Ivysaur
  0x04: 3,    // Venusaur
  0x05: 4,    // Charmander
  0x06: 5,    // Charmeleon
  0x07: 6,    // Charizard
  0x08: 7,    // Squirtle
  0x09: 8,    // Wartortle
  0x0A: 9,    // Blastoise
  0x0B: 10,   // Caterpie
  0x0C: 11,   // Metapod
  0x0D: 12,   // Butterfree
  0x0E: 13,   // Weedle
  0x0F: 14,   // Kakuna
  0x10: 15,   // Beedrill
  0x11: 16,   // Pidgey
  0x12: 17,   // Pidgeotto
  0x13: 18,   // Pidgeot
  0x14: 19,   // Rattata
  0x15: 20,   // Raticate
  0x16: 21,   // Spearow
  0x17: 22,   // Fearow
  0x18: 23,   // Ekans
  0x19: 24,   // Arbok
  0x1A: 25,   // Pikachu
  0x1B: 26,   // Raichu
  0x1C: 27,   // Sandshrew
  0x1D: 28,   // Sandslash
  0x1E: 29,   // Nidoran♀
  0x1F: 30,   // Nidorina
  0x20: 31,   // Nidoqueen
  0x21: 32,   // Nidoran♂
  0x22: 33,   // Nidorino
  0x23: 34,   // Nidoking
  0x24: 35,   // Clefairy
  0x25: 36,   // Clefable
  0x26: 37,   // Vulpix
  0x27: 38,   // Ninetales
  0x28: 39,   // Jigglypuff
  0x29: 40,   // Wigglytuff
  0x2A: 41,   // Zubat
  0x2B: 42,   // Golbat
  0x2C: 43,   // Oddish
  0x2D: 44,   // Gloom
  0x2E: 45,   // Vileplume
  0x2F: 46,   // Paras
  0x30: 47,   // Parasect
  0x31: 48,   // Venonat
  0x32: 49,   // Venomoth
  0x33: 50,   // Diglett
  0x34: 51,   // Dugtrio
  0x35: 52,   // Meowth
  0x36: 53,   // Persian
  0x37: 54,   // Psyduck
  0x38: 55,   // Golduck
  0x39: 56,   // Mankey
  0x3A: 57,   // Primeape
  0x3B: 58,   // Growlithe
  0x3C: 59,   // Arcanine
  0x3D: 60,   // Poliwag
  0x3E: 61,   // Poliwhirl
  0x3F: 62,   // Poliwrath
  0x40: 63,   // Abra
  0x41: 64,   // Kadabra
  0x42: 65,   // Alakazam
  0x43: 66,   // Machop
  0x44: 67,   // Machoke
  0x45: 68,   // Machamp
  0x46: 69,   // Bellsprout
  0x47: 70,   // Weepinbell
  0x48: 71,   // Victreebel
  0x49: 72,   // Tentacool
  0x4A: 73,   // Tentacruel
  0x4B: 74,   // Geodude
  0x4C: 75,   // Graveler
  0x4D: 76,   // Golem
  0x4E: 77,   // Ponyta
  0x4F: 78,   // Rapidash
  0x50: 79,   // Slowpoke
  0x51: 80,   // Slowbro
  0x52: 81,   // Magnemite
  0x53: 82,   // Magneton
  0x54: 83,   // Farfetch'd
  0x55: 84,   // Doduo
  0x56: 85,   // Dodrio
  0x57: 86,   // Seel
  0x58: 87,   // Dewgong
  0x59: 88,   // Grimer
  0x5A: 89,   // Muk
  0x5B: 90,   // Shellder
  0x5C: 91,   // Cloyster
  0x5D: 92,   // Gastly
  0x5E: 93,   // Haunter
  0x5F: 94,   // Gengar
  0x60: 95,   // Onix
  0x61: 96,   // Drowzee
  0x62: 97,   // Hypno
  0x63: 98,   // Krabby
  0x64: 99,   // Kingler
  0x65: 100,  // Voltorb
  0x66: 101,  // Electrode
  0x67: 102,  // Exeggcute
  0x68: 103,  // Exeggutor
  0x69: 104,  // Cubone
  0x6A: 105,  // Marowak
  0x6B: 106,  // Hitmonlee
  0x6C: 107,  // Hitmonchan
  0x6D: 108,  // Lickitung
  0x6E: 109,  // Koffing
  0x6F: 110,  // Weezing
  0x70: 111,  // Rhyhorn
  0x71: 112,  // Rhydon
  0x72: 113,  // Chansey
  0x73: 114,  // Tangela
  0x74: 115,  // Kangaskhan
  0x75: 116,  // Horsea
  0x76: 117,  // Seadra
  0x77: 118,  // Goldeen
  0x78: 119,  // Seaking
  0x79: 120,  // Staryu
  0x7A: 121,  // Starmie
  0x7B: 122,  // Mr. Mime
  0x7C: 123,  // Scyther
  0x7D: 124,  // Jynx
  0x7E: 125,  // Electabuzz
  0x7F: 126,  // Magmar
  0x80: 127,  // Pinsir
  0x81: 128,  // Tauros
  0x82: 129,  // Magikarp
  0x83: 130,  // Gyarados
  0x84: 131,  // Lapras
  0x85: 132,  // Ditto
  0x86: 133,  // Eevee
  0x87: 134,  // Vaporeon
  0x88: 135,  // Jolteon
  0x89: 136,  // Flareon
  0x8A: 137,  // Porygon
  0x8B: 138,  // Omanyte
  0x8C: 139,  // Omastar
  0x8D: 140,  // Kabuto
  0x8E: 141,  // Kabutops
  0x8F: 142,  // Aerodactyl
  0x90: 143,  // Snorlax
  0x91: 144,  // Articuno
  0x92: 145,  // Zapdos
  0x93: 146,  // Moltres
  0x94: 147,  // Dratini
  0x95: 148,  // Dragonair
  0x96: 149,  // Dragonite
  0x97: 150,  // Mewtwo
  0x98: 151,  // Mew
};

// Make available globally
window.GEN1_OFFSETS = GEN1_OFFSETS;
window.GEN1_INTERNAL_TO_DEX = GEN1_INTERNAL_TO_DEX;
