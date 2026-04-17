/**
 * Type definitions for Gen 1 Save Parser
 * Using JSDoc for type hints in JavaScript files
 */

/**
 * @typedef {Object} PokemonStats
 * @property {number} pid - Pokémon ID (personality value, 0 in Gen 1)
 * @property {number} speciesId - Internal species ID
 * @property {number} dexId - National Dex ID
 * @property {string} speciesName - Species name
 * @property {string} nickname - Pokémon's nickname
 * @property {boolean} isNicknamed - Whether the Pokémon has a custom nickname
 * @property {number} form - Form number (0 in Gen 1)
 * @property {string} originalTrainerName - OT name
 * @property {number} originalTrainerId - OT ID
 * @property {number} secretId - Secret ID (0 in Gen 1)
 * @property {string} originalTrainerGender - OT gender
 * @property {number} level - Current level
 * @property {number} exp - Experience points
 * @property {number} friendship - Friendship value (0 in Gen 1)
 * @property {number} hp - Current HP
 * @property {number} maxHp - Maximum HP
 * @property {number} attack - Attack stat
 * @property {number} defense - Defense stat
 * @property {number} speed - Speed stat
 * @property {number} special - Special stat (Gen 1)
 * @property {number} spAtk - Special Attack (same as special in Gen 1)
 * @property {number} spDef - Special Defense (same as special in Gen 1)
 * @property {number} type1 - Type 1 ID
 * @property {number} type2 - Type 2 ID
 * @property {string} type1Name - Type 1 name
 * @property {string} type2Name - Type 2 name
 * @property {string|string[]} status - Status condition(s)
 * @property {number} catchRate - Catch rate
 * @property {string[]} moves - Move names
 * @property {number[]} moveIds - Move IDs
 * @property {number[]} movePp - Move PP values
 * @property {number[]} movePpUps - Move PP Up count
 * @property {boolean} isParty - Whether this Pokémon is in the party
 * @property {boolean} isEgg - Is an egg (false in Gen 1)
 * @property {boolean} isShiny - Is shiny (false in Gen 1)
 * @property {string} gender - Gender
 * @property {number} pokerus - Pokerus strain (0 in Gen 1)
 * @property {Object} iv - Individual Values
 * @property {Object} ev - Effort Values
 * @property {Uint8Array} raw - Raw data
 * @property {number} startOffset - Offset in save file
 * @property {Uint8Array} nicknameRaw - Raw nickname bytes
 * @property {Uint8Array} otNameRaw - Raw OT name bytes
 */

/**
 * @typedef {Object} Item
 * @property {number} id - Item ID
 * @property {string} name - Item name
 * @property {number} count - Quantity
 */

/**
 * @typedef {Object} HallOfFamePokemon
 * @property {number} speciesId - Internal species ID
 * @property {number} dexId - National Dex ID
 * @property {string} speciesName - Species name
 * @property {string} nickname - Nickname
 * @property {number} level - Level
 * @property {string[]} types - Types
 */

/**
 * @typedef {Object} HallOfFameTeam
 * @property {number} id - Team ID
 * @property {HallOfFamePokemon[]} pokemon - Pokémon on the team
 */

/**
 * @typedef {'Red'|'Blue'|'Yellow'} GameVersion
 */

/**
 * @typedef {Object} GameOptions
 * @property {'Fast'|'Normal'|'Slow'} textSpeed - Text speed setting
 * @property {'On'|'Off'} battleAnimation - Battle animation setting
 * @property {'Shift'|'Set'} battleStyle - Battle style setting
 * @property {'Mono'|'Stereo'|'Earphone1'|'Earphone2'|'Earphone3'} sound - Sound output setting
 */

/**
 * @typedef {Object} ParsedSave
 * @property {number} generation - Generation number (1)
 * @property {GameVersion} gameVersion - Game version
 * @property {string} originalFilename - Original filename
 * @property {number} fileSize - File size in bytes
 * @property {boolean} isValid - Whether checksum is valid
 * @property {Object} trainer - Trainer information
 * @property {string} trainer.name - Trainer name
 * @property {string} trainer.id - Trainer ID
 * @property {number} trainer.money - Money amount
 * @property {number} trainer.coins - Casino coins
 * @property {string} trainer.playTime - Play time string
 * @property {string[]} trainer.badges - Owned badges
 * @property {string} trainer.rivalName - Rival's name
 * @property {number} trainer.pikachuFriendship - Pikachu friendship (Yellow only)
 * @property {string} trainer.gender - Trainer gender
 * @property {GameOptions} options - Game options
 * @property {Object} map - Map/location data
 * @property {number} map.currentMapId - Current map ID
 * @property {number} map.x - X coordinate
 * @property {number} map.y - Y coordinate
 * @property {number} map.lastMapId - Last map ID
 * @property {number} map.warpedFromMap - Warped from map ID
 * @property {PokemonStats[]} daycare - Daycare Pokémon
 * @property {number} playerStarterId - Player's starter Pokémon Dex ID
 * @property {number} rivalStarterId - Rival's starter Pokémon Dex ID
 * @property {number} pokedexOwned - Number of owned Pokémon
 * @property {number} pokedexSeen - Number of seen Pokémon
 * @property {boolean[]} pokedexOwnedFlags - Owned flags array
 * @property {boolean[]} pokedexSeenFlags - Seen flags array
 * @property {boolean[]} eventFlags - Event flags array
 * @property {number} partyCount - Number of Pokémon in party
 * @property {PokemonStats[]} party - Party Pokémon
 * @property {number} currentBoxId - Current PC box ID
 * @property {number} currentBoxCount - Number of Pokémon in current box
 * @property {PokemonStats[]} currentBoxPokemon - Current box Pokémon
 * @property {PokemonStats[][]} pcBoxes - All PC boxes
 * @property {HallOfFameTeam[]} hallOfFame - Hall of Fame teams
 * @property {Item[]} items - Bag items
 * @property {Item[]} pcItems - PC items
 * @property {Uint8Array} rawData - Raw save data
 */

/**
 * @typedef {Object} ParserResult
 * @property {boolean} success - Whether parsing was successful
 * @property {ParsedSave} [data] - Parsed save data (if successful)
 * @property {string} [error] - Error message (if failed)
 */

export {};
