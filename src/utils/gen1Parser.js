/**
 * Gen 1 Pokémon Save Parser
 * Parses Game Boy Pokémon Red/Blue/Yellow save files
 * 
 * Save file structure for Gen 1:
 * - Total size: 32KB (0x8000 bytes) or 64KB with header
 * - Contains two save slots for redundancy
 * - Each slot is ~0x2000 bytes
 */

// Gen 1 Pokémon species names
const POKEMON_NAMES = [
  'MissingNo', 'Bulbasaur', 'Ivysaur', 'Venusaur', 'Charmander', 'Charmeleon', 'Charizard',
  'Squirtle', 'Wartortle', 'Blastoise', 'Caterpie', 'Metapod', 'Butterfree', 'Weedle',
  'Kakuna', 'Beedrill', 'Pidgey', 'Pidgeotto', 'Pidgeot', 'Rattata', 'Raticate',
  'Spearow', 'Fearow', 'Ekans', 'Arbok', 'Pikachu', 'Raichu', 'Sandshrew', 'Sandslash',
  'Nidoran♀', 'Nidorina', 'Nidoqueen', 'Nidoran♂', 'Nidorino', 'Nidoking', 'Clefairy',
  'Clefable', 'Vulpix', 'Ninetales', 'Jigglypuff', 'Wigglytuff', 'Zubat', 'Golbat',
  'Oddish', 'Gloom', 'Vileplume', 'Paras', 'Parasect', 'Venonat', 'Venomoth',
  'Diglett', 'Dugtrio', 'Meowth', 'Persian', 'Psyduck', 'Golduck', 'Mankey', 'Primeape',
  'Growlithe', 'Arcanine', 'Poliwag', 'Poliwhirl', 'Poliwrath', 'Abra', 'Kadabra',
  'Alakazam', 'Machop', 'Machoke', 'Machamp', 'Bellsprout', 'Weepinbell', 'Victreebel',
  'Tentacool', 'Tentacruel', 'Geodude', 'Graveler', 'Golem', 'Ponyta', 'Rapidash',
  'Slowpoke', 'Slowbro', 'Magnemite', 'Magneton', 'Farfetch\'d', 'Doduo', 'Dodrio',
  'Seel', 'Dewgong', 'Grimer', 'Muk', 'Shellder', 'Cloyster', 'Gastly', 'Haunter',
  'Gengar', 'Onix', 'Drowzee', 'Hypno', 'Krabby', 'Kingler', 'Voltorb', 'Electrode',
  'Exeggcute', 'Exeggutor', 'Cubone', 'Marowak', 'Hitmonlee', 'Hitmonchan', 'Lickitung',
  'Koffing', 'Weezing', 'Rhyhorn', 'Rhydon', 'Chansey', 'Tangela', 'Kangaskhan',
  'Horsea', 'Seadra', 'Goldeen', 'Seaking', 'Staryu', 'Starmie', 'Mr. Mime', 'Scyther',
  'Jynx', 'Electabuzz', 'Magmar', 'Pinsir', 'Tauros', 'Magikarp', 'Gyarados', 'Lapras',
  'Ditto', 'Eevee', 'Vaporeon', 'Jolteon', 'Flareon', 'Porygon', 'Omanyte', 'Omastar',
  'Kabuto', 'Kabutops', 'Aerodactyl', 'Snorlax', 'Articuno', 'Zapdos', 'Moltres',
  'Dratini', 'Dragonair', 'Dragonite', 'Mewtwo', 'Mew'
];

// Move names for Gen 1
const MOVE_NAMES = [
  'None', 'Pound', 'Karate Chop', 'Double Slap', 'Comet Punch', 'Mega Punch', 'Pay Day',
  'Fire Punch', 'Ice Punch', 'Thunder Punch', 'Scratch', 'Vice Grip', 'Guillotine',
  'Razor Wind', 'Swords Dance', 'Cut', 'Gust', 'Wing Attack', 'Whirlwind', 'Fly',
  'Bind', 'Slam', 'Vine Whip', 'Stomp', 'Double Kick', 'Mega Kick', 'Jump Kick',
  'Rolling Kick', 'Sand Attack', 'Headbutt', 'Horn Attack', 'Fury Attack', 'Horn Drill',
  'Tackle', 'Body Slam', 'Wrap', 'Take Down', 'Thrash', 'Double-Edge', 'Tail Whip',
  'Poison Sting', 'Twineedle', 'Pin Missile', 'Leer', 'Bite', 'Growl', 'Roar',
  'Sing', 'Supersonic', 'Sonic Boom', 'Disable', 'Acid', 'Ember', 'Flamethrower',
  'Mist', 'Water Gun', 'Hydro Pump', 'Surf', 'Ice Beam', 'Blizzard', 'Psybeam',
  'Bubble Beam', 'Aurora Beam', 'Hyper Beam', 'Peck', 'Drill Peck', 'Submission',
  'Low Kick', 'Counter', 'Seismic Toss', 'Strength', 'Absorb', 'Mega Drain',
  'Leech Seed', 'Growth', 'Razor Leaf', 'Solar Beam', 'Poison Powder', 'Stun Spore',
  'Sleep Powder', 'Petal Dance', 'String Shot', 'Dragon Rage', 'Fire Spin',
  'Thunder Shock', 'Thunderbolt', 'Thunder Wave', 'Thunder', 'Rock Throw', 'Earthquake',
  'Fissure', 'Dig', 'Toxic', 'Confusion', 'Psychic', 'Hypnosis', 'Meditate', 'Agility',
  'Quick Attack', 'Rage', 'Teleport', 'Night Shade', 'Mimic', 'Screech', 'Double Team',
  'Recover', 'Harden', 'Minimize', 'Smokescreen', 'Confuse Ray', 'Withdraw', 'Defense Curl',
  'Barrier', 'Light Screen', 'Haze', 'Reflect', 'Focus Energy', 'Bide', 'Metronome',
  'Mirror Move', 'Self-Destruct', 'Egg Bomb', 'Lick', 'Smog', 'Sludge', 'Bone Club',
  'Fire Blast', 'Waterfall', 'Clamp', 'Swift', 'Skull Bash', 'Spike Cannon', 'Constrict',
  'Amnesia', 'Kinesis', 'Soft-Boiled', 'High Jump Kick', 'Glare', 'Dream Eater',
  'Poison Gas', 'Barrage', 'Leech Life', 'Lovely Kiss', 'Sky Attack', 'Transform',
  'Bubble', 'Dizzy Punch', 'Spore', 'Flash', 'Psywave', 'Splash', 'Acid Armor',
  'Crabhammer', 'Explosion', 'Fury Swipes', 'Bonemerang', 'Rest', 'Rock Slide',
  'Hyper Fang', 'Sharpen', 'Conversion', 'Tri Attack', 'Super Fang', 'Slash',
  'Substitute', 'Struggle'
];

// Type names for Gen 1
const TYPE_NAMES = [
  'Normal', 'Fighting', 'Flying', 'Poison', 'Ground', 'Rock', 'Bug', 'Ghost',
  'Fire', 'Water', 'Grass', 'Electric', 'Psychic', 'Ice', 'Dragon'
];

/**
 * Read a little-endian 16-bit unsigned integer from a DataView
 */
function readU16LE(dataView, offset) {
  return dataView.getUint16(offset, true);
}

/**
 * Read a little-endian 32-bit unsigned integer from a DataView
 */
function readU32LE(dataView, offset) {
  return dataView.getUint32(offset, true);
}

/**
 * Read a string from the save data (Gen 1 uses special character encoding)
 */
function readGen1String(dataView, offset, maxLength) {
  let result = '';
  for (let i = 0; i < maxLength; i++) {
    const charCode = dataView.getUint8(offset + i);
    if (charCode === 0x50 || charCode === 0xFF) break; // End of string markers
    if (charCode >= 0x04 && charCode <= 0x13) {
      // Uppercase letters A-Z
      result += String.fromCharCode(charCode + 0x56);
    } else if (charCode >= 0x14 && charCode <= 0x1D) {
      // Lowercase letters a-j (simplified)
      result += String.fromCharCode(charCode + 0x69);
    } else if (charCode === 0x1A) {
      result += '\'';
    } else if (charCode === 0x1B) {
      result += '-';
    } else if (charCode === 0x1C) {
      result += '?';
    } else if (charCode === 0x1D) {
      result += '!';
    } else if (charCode === 0x1E) {
      result += '.';
    } else if (charCode === 0x1F) {
      result += '×'; // Male symbol
    } else if (charCode === 0x20) {
      result += ')'; // Female symbol (actually just a parenthesis in most fonts)
    } else if (charCode === 0x21) {
      result += ',';
    } else if (charCode === 0x22) {
      result += '/';
    } else if (charCode === 0x23) {
      result += ' ';
    } else {
      result += '?'; // Unknown character
    }
  }
  return result.trim();
}

/**
 * Parse a single Pokémon's data from Gen 1 save
 * Gen 1 Pokémon structure is 44 bytes in party, 33 bytes in PC
 */
function parsePokemon(dataView, offset, isInParty = true) {
  const pokemonSize = isInParty ? 44 : 33;
  
  // Species (1 byte)
  const speciesId = dataView.getUint8(offset);
  const name = speciesId < POKEMON_NAMES.length ? POKEMON_NAMES[speciesId] : 'Unknown';
  
  // Current HP (2 bytes)
  const currentHp = readU16LE(dataView, offset + 1);
  
  // Level (1 byte)
  const level = dataView.getUint8(offset + 3);
  
  // Status (1 byte) - sleep, poison, burn, freeze, paralysis
  const status = dataView.getUint8(offset + 4);
  
  // Types (2 bytes)
  const type1Id = dataView.getUint8(offset + 5);
  const type2Id = dataView.getUint8(offset + 6);
  const type1 = type1Id < TYPE_NAMES.length ? TYPE_NAMES[type1Id] : 'Normal';
  const type2 = type2Id < TYPE_NAMES.length ? TYPE_NAMES[type2Id] : null;
  
  // Catch rate / Held item (1 byte) - Gen 1 didn't have held items
  // This is actually the catch rate in Gen 1
  
  // Moves (4 moves × 1 byte each = 4 bytes)
  const moveIds = [];
  for (let i = 0; i < 4; i++) {
    moveIds.push(dataView.getUint8(offset + 7 + i));
  }
  const moves = moveIds.map(id => id < MOVE_NAMES.length ? MOVE_NAMES[id] : 'None').filter(m => m !== 'None');
  
  // Original Trainer ID (2 bytes)
  const otId = readU16LE(dataView, offset + 11);
  
  // Exp (3 bytes)
  const exp = dataView.getUint8(offset + 13) | 
              (dataView.getUint8(offset + 14) << 8) | 
              (dataView.getUint8(offset + 15) << 16);
  
  // HP EV (2 bytes) and other stats
  const hpEv = readU16LE(dataView, offset + 16);
  const attackEv = readU16LE(dataView, offset + 18);
  const defenseEv = readU16LE(dataView, offset + 20);
  const speedEv = readU16LE(dataView, offset + 22);
  const specialEv = readU16LE(dataView, offset + 24);
  
  // IVs (4 bytes total, packed)
  const ivData = dataView.getUint16(offset + 26, true);
  const hpIv = ((ivData >> 12) & 0xF);
  const attackIv = ((ivData >> 8) & 0xF);
  const defenseIv = ((ivData >> 4) & 0xF);
  const speedIv = (ivData & 0xF);
  const specialIv = hpIv; // Special IV = HP IV in Gen 1
  
  // Nickname (11 bytes) - only in party
  let nickname = '';
  if (isInParty) {
    nickname = readGen1String(dataView, offset + 28, 11);
  }
  
  // Calculate base stats (simplified approximation)
  const baseStats = calculateBaseStats(speciesId, level);
  
  return {
    id: speciesId,
    name,
    level,
    currentHp,
    maxHp: baseStats.hp, // Approximation
    status: parseStatus(status),
    types: type2 ? [type1.toLowerCase(), type2.toLowerCase()] : [type1.toLowerCase()],
    moves,
    otId,
    exp,
    evs: {
      hp: hpEv,
      attack: attackEv,
      defense: defenseEv,
      speed: speedEv,
      special: specialEv
    },
    ivs: {
      hp: hpIv,
      attack: attackIv,
      defense: defenseIv,
      speed: speedIv,
      special: specialIv
    },
    nickname: nickname || name,
    isEgg: false,
    shiny: false // No shininess in Gen 1
  };
}

/**
 * Parse status conditions
 */
function parseStatus(statusByte) {
  const conditions = [];
  if (statusByte & 0x07) conditions.push('Sleep');
  if (statusByte & 0x08) conditions.push('Poison');
  if (statusByte & 0x10) conditions.push('Burn');
  if (statusByte & 0x20) conditions.push('Freeze');
  if (statusByte & 0x40) conditions.push('Paralysis');
  if (statusByte & 0x80) conditions.push('Bad Poison');
  return conditions.length > 0 ? conditions : 'OK';
}

/**
 * Calculate approximate base stats for a Pokémon
 * This is a simplified version - real calculation is more complex
 */
function calculateBaseStats(speciesId, level) {
  // Base stat ranges by species (simplified lookup table)
  const baseStatsTable = {
    1: { hp: 45, attack: 49, defense: 49 },   // Bulbasaur
    4: { hp: 39, attack: 52, defense: 43 },   // Charmander
    7: { hp: 44, attack: 48, defense: 65 },   // Squirtle
    25: { hp: 35, attack: 55, defense: 40 },  // Pikachu
    150: { hp: 106, attack: 110, defense: 90 } // Mewtwo
  };
  
  const base = baseStatsTable[speciesId] || { hp: 50, attack: 50, defense: 50 };
  
  // Calculate actual stats at given level (simplified formula)
  const hp = Math.floor(((base.hp * 2 + 64) * level) / 100) + level + 10;
  const attack = Math.floor(((base.attack * 2 + 64) * level) / 100) + 5;
  const defense = Math.floor(((base.defense * 2 + 64) * level) / 100) + 5;
  
  return { hp, attack, defense };
}

/**
 * Find the valid save slot in Gen 1 save data
 * Gen 1 has two save slots, we need to find the one with valid checksum
 */
function findValidSaveSlot(data) {
  const SLOT_SIZE = 0x2000;
  const NUM_SLOTS = 2;
  
  for (let i = 0; i < NUM_SLOTS; i++) {
    const slotOffset = i * SLOT_SIZE;
    const sectionCount = dataView.getUint8(slotOffset);
    
    // Check if this looks like a valid save
    if (sectionCount > 0 && sectionCount <= 14) {
      return slotOffset;
    }
  }
  
  return 0; // Default to first slot
}

/**
 * Main function to parse Gen 1 save data
 */
export function parseGen1Save(arrayBuffer) {
  const data = new Uint8Array(arrayBuffer);
  const dataView = new DataView(arrayBuffer);
  
  // Determine save size and find valid slot
  let saveOffset = 0;
  
  // Check for 64KB save with header
  if (data.length >= 0x10000) {
    // Look for save data pattern
    saveOffset = findValidSaveSlot(data);
  }
  
  // Parse trainer info
  // Trainer name is at offset 0x2598 in the save slot (relative)
  const trainerNameOffset = saveOffset + 0x2598;
  const trainerName = readGen1String(dataView, trainerNameOffset, 11);
  
  // Trainer ID at 0x25A4
  const trainerId = readU16LE(dataView, saveOffset + 0x25A4);
  
  // Money at 0x25F6 (3 bytes BCD encoded)
  const moneyBytes = [
    dataView.getUint8(saveOffset + 0x25F6),
    dataView.getUint8(saveOffset + 0x25F7),
    dataView.getUint8(saveOffset + 0x25F8)
  ];
  // Convert BCD to decimal
  const money = ((moneyBytes[0] & 0x0F) * 10000) +
                (((moneyBytes[0] >> 4) & 0x0F) * 1000) +
                ((moneyBytes[1] & 0x0F) * 100) +
                (((moneyBytes[1] >> 4) & 0x0F) * 10) +
                (moneyBytes[2] & 0x0F);
  
  // Badges at 0x25E9 (1 byte, bit flags)
  const badgesByte = dataView.getUint8(saveOffset + 0x25E9);
  const badges = [];
  const badgeNames = ['Boulder', 'Cascade', 'Thunder', 'Rainbow', 'Soul', 'Marsh', 'Volcano', 'Earth'];
  for (let i = 0; i < 8; i++) {
    if (badgesByte & (1 << i)) {
      badges.push(badgeNames[i]);
    }
  }
  
  // Party Pokémon count at 0x2F2D
  const partyCount = dataView.getUint8(saveOffset + 0x2F2D);
  
  // Party Pokémon start at 0x2F2F
  const partyOffset = saveOffset + 0x2F2F;
  const party = [];
  for (let i = 0; i < Math.min(partyCount, 6); i++) {
    const pokemon = parsePokemon(dataView, partyOffset + (i * 44), true);
    party.push(pokemon);
  }
  
  // PC Pokémon storage
  // PC box count at 0x2FE3
  const pcBoxCount = dataView.getUint8(saveOffset + 0x2FE3);
  
  // PC Pokémon start at 0x2FE4
  const pcOffset = saveOffset + 0x2FE4;
  const pcPokemon = [];
  for (let i = 0; i < Math.min(pcBoxCount, 50); i++) {
    const pokemon = parsePokemon(dataView, pcOffset + (i * 33), false);
    pcPokemon.push(pokemon);
  }
  
  return {
    generation: 1,
    game: 'Pokémon Red/Blue/Yellow',
    trainer: {
      name: trainerName || 'Red',
      id: trainerId,
      money: money || 3000,
      badges
    },
    party,
    pcPokemon,
    pcBoxCount,
    raw: {
      data,
      dataView
    }
  };
}

/**
 * Detect if a save file is Gen 1
 */
export function isGen1Save(arrayBuffer) {
  const data = new Uint8Array(arrayBuffer);
  
  // Gen 1 saves are typically 32KB or 64KB
  if (data.length !== 0x8000 && data.length !== 0x10000 && data.length !== 0x2000) {
    return false;
  }
  
  // Check for characteristic Gen 1 data patterns
  // The section count byte should be in a reasonable range
  const sectionCount = data[0];
  if (sectionCount > 0 && sectionCount <= 14) {
    return true;
  }
  
  // Additional heuristic: check for Pokémon species IDs in expected ranges
  // Party count should be 1-6
  if (data.length >= 0x2F2D) {
    const partyCount = data[0x2F2D];
    if (partyCount >= 1 && partyCount <= 6) {
      return true;
    }
  }
  
  return false;
}

export default {
  parseGen1Save,
  isGen1Save,
  POKEMON_NAMES,
  MOVE_NAMES,
  TYPE_NAMES
};
