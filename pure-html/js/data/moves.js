/**
 * Gen 1 Move Names
 */
const MOVE_NAMES = [
    'None',           // 0
    'Pound',          // 1
    'Karate Chop',    // 2
    'Double Slap',    // 3
    'Comet Punch',    // 4
    'Mega Punch',     // 5
    'Pay Day',        // 6
    'Fire Punch',     // 7
    'Ice Punch',      // 8
    'Thunder Punch',  // 9
    'Scratch',        // 10
    'Vice Grip',      // 11
    'Guillotine',     // 12
    'Razor Wind',     // 13
    'Swords Dance',   // 14
    'Cut',            // 15
    'Gust',           // 16
    'Wing Attack',    // 17
    'Whirlwind',      // 18
    'Fly',            // 19
    'Bind',           // 20
    'Slam',           // 21
    'Vine Whip',      // 22
    'Stomp',          // 23
    'Double Kick',    // 24
    'Mega Kick',      // 25
    'Jump Kick',      // 26
    'Rolling Kick',   // 27
    'Sand Attack',    // 28
    'Headbutt',       // 29
    'Horn Attack',    // 30
    'Fury Attack',    // 31
    'Horn Drill',     // 32
    'Tackle',         // 33
    'Body Slam',      // 34
    'Wrap',           // 35
    'Take Down',      // 36
    'Thrash',         // 37
    'Double-Edge',    // 38
    'Tail Whip',      // 39
    'Poison Sting',   // 40
    'Twineedle',      // 41
    'Pin Missile',    // 42
    'Leer',           // 43
    'Bite',           // 44
    'Growl',          // 45
    'Roar',           // 46
    'Sing',           // 47
    'Supersonic',     // 48
    'Sonic Boom',     // 49
    'Disable',        // 50
    'Acid',           // 51
    'Ember',          // 52
    'Flamethrower',   // 53
    'Mist',           // 54
    'Water Gun',      // 55
    'Hydro Pump',     // 56
    'Surf',           // 57
    'Ice Beam',       // 58
    'Blizzard',       // 59
    'Psybeam',        // 60
    'Bubble Beam',    // 61
    'Aurora Beam',    // 62
    'Hyper Beam',     // 63
    'Peck',           // 64
    'Drill Peck',     // 65
    'Submission',     // 66
    'Low Kick',       // 67
    'Counter',        // 68
    'Seismic Toss',   // 69
    'Strength',       // 70
    'Absorb',         // 71
    'Mega Drain',     // 72
    'Leech Seed',     // 73
    'Growth',         // 74
    'Razor Leaf',     // 75
    'Solar Beam',     // 76
    'Poison Powder',  // 77
    'Stun Spore',     // 78
    'Sleep Powder',   // 79
    'Petal Dance',    // 80
    'String Shot',    // 81
    'Dragon Rage',    // 82
    'Fire Spin',      // 83
    'Thunder Shock',  // 84
    'Thunderbolt',    // 85
    'Thunder Wave',   // 86
    'Thunder',        // 87
    'Rock Throw',     // 88
    'Earthquake',     // 89
    'Fissure',        // 90
    'Dig',            // 91
    'Toxic',          // 92
    'Confusion',      // 93
    'Psychic',        // 94
    'Hypnosis',       // 95
    'Meditate',       // 96
    'Agility',        // 97
    'Quick Attack',   // 98
    'Rage',           // 99
    'Teleport',       // 100
    'Night Shade',    // 101
    'Mimic',          // 102
    'Screech',        // 103
    'Double Team',    // 104
    'Recover',        // 105
    'Harden',         // 106
    'Minimize',       // 107
    'Smokescreen',    // 108
    'Confuse Ray',    // 109
    'Withdraw',       // 110
    'Defense Curl',   // 111
    'Barrier',        // 112
    'Light Screen',   // 113
    'Haze',           // 114
    'Reflect',        // 115
    'Focus Energy',   // 116
    'Bide',           // 117
    'Metronome',      // 118
    'Mirror Move',    // 119
    'Self-Destruct',  // 120
    'Egg Bomb',       // 121
    'Lick',           // 122
    'Smog',           // 123
    'Sludge',         // 124
    'Bone Club',      // 125
    'Fire Blast',     // 126
    'Waterfall',      // 127
    'Clamp',          // 128
    'Swift',          // 129
    'Skull Bash',     // 130
    'Spike Cannon',   // 131
    'Constrict',      // 132
    'Amnesia',        // 133
    'Kinesis',        // 134
    'Soft-Boiled',    // 135
    'High Jump Kick', // 136
    'Glare',          // 137
    'Dream Eater',    // 138
    'Poison Gas',     // 139
    'Barrage',        // 140
    'Leech Life',     // 141
    'Lovely Kiss',    // 142
    'Sky Attack',     // 143
    'Transform',      // 144
    'Bubble',         // 145
    'Dizzy Punch',    // 146
    'Spore',          // 147
    'Flash',          // 148
    'Psywave',        // 149
    'Splash',         // 150
    'Acid Armor',     // 151
    'Crabhammer',     // 152
    'Explosion',      // 153
    'Fury Swipes',    // 154
    'Bonemerang',     // 155
    'Rest',           // 156
    'Rock Slide',     // 157
    'Hyper Fang',     // 158
    'Sharpen',        // 159
    'Conversion',     // 160
    'Tri Attack',     // 161
    'Super Fang',     // 162
    'Slash',          // 163
    'Substitute',     // 164
    'Struggle'        // 165
];

/**
 * Get move name by ID
 */
function getMoveName(moveId) {
    if (moveId < 0 || moveId >= MOVE_NAMES.length) {
        return 'None';
    }
    return MOVE_NAMES[moveId] || 'None';
}

// Make available globally
window.MOVE_NAMES = MOVE_NAMES;
window.getMoveName = getMoveName;
