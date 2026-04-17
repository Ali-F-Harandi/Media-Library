/**
 * Component to render Gen 1 save information
 */
function createGen1SaveInfo(saveData) {
    if (!saveData || saveData.generation !== 1) {
        return '';
    }

    const { trainer, party, currentBoxPokemon, currentBoxCount, gameVersion } = saveData;

    let html = `
        <div class="w-full max-w-6xl mx-auto mt-8 px-4 space-y-6">
            <!-- Game Info Header -->
            <div class="bg-gradient-to-r from-red-600 to-blue-600 rounded-xl p-6 text-white shadow-lg">
                <div class="flex items-center justify-between">
                    <div>
                        <h2 class="text-2xl font-bold font-mono">${gameVersion}</h2>
                        <p class="text-red-100 text-sm font-mono">Generation I Save Data</p>
                    </div>
                    <div class="text-right">
                        <p class="text-xs text-red-200 font-mono">TRAINER ID</p>
                        <p class="text-xl font-bold font-mono">${trainer.id.toString().padStart(5, '0')}</p>
                    </div>
                </div>
            </div>

            <!-- Trainer Card -->
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                <div class="bg-gradient-to-r from-yellow-400 to-orange-500 p-4">
                    <div class="flex items-center space-x-3">
                        <svg class="text-white" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                            <circle cx="12" cy="7" r="4"/>
                        </svg>
                        <h3 class="text-xl font-bold text-white font-mono">TRAINER CARD</h3>
                    </div>
                </div>

                <div class="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <!-- Name -->
                    <div class="space-y-2">
                        <label class="text-xs font-bold text-gray-500 dark:text-gray-400 font-mono uppercase">
                            Trainer Name
                        </label>
                        <div class="text-2xl font-bold text-gray-900 dark:text-white font-mono border-b-2 border-gray-300 dark:border-gray-600 pb-2">
                            ${trainer.name}
                        </div>
                    </div>

                    <!-- Money -->
                    <div class="space-y-2">
                        <label class="text-xs font-bold text-gray-500 dark:text-gray-400 font-mono uppercase flex items-center">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-1">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/>
                                <path d="M12 18V6"/>
                            </svg>
                            Money
                        </label>
                        <div class="text-2xl font-bold text-green-600 dark:text-green-400 font-mono border-b-2 border-gray-300 dark:border-gray-600 pb-2">
                            ₽${trainer.money.toLocaleString()}
                        </div>
                    </div>

                    <!-- Badges -->
                    <div class="space-y-2">
                        <label class="text-xs font-bold text-gray-500 dark:text-gray-400 font-mono uppercase flex items-center">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-1">
                                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
                                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                                <path d="M4 22h16"/>
                                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
                                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
                                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
                            </svg>
                            Badges (${trainer.badges.length}/8)
                        </label>
                        <div class="flex flex-wrap gap-2 pt-1">
                            ${trainer.badges.length === 0 
                                ? '<span class="text-gray-400 text-sm font-mono">No badges yet</span>' 
                                : trainer.badges.map((badge, index) => `
                                    <span class="px-2 py-1 bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900 dark:to-yellow-800 text-yellow-800 dark:text-yellow-200 rounded text-xs font-bold font-mono border border-yellow-300 dark:border-yellow-700">
                                        ${badge}
                                    </span>
                                `).join('')
                            }
                        </div>
                    </div>
                </div>
            </div>
    `;

    // Party Pokémon
    if (party && party.length > 0) {
        html += `
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                <div class="bg-gradient-to-r from-green-500 to-emerald-600 p-4">
                    <div class="flex items-center space-x-3">
                        <svg class="text-white" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                        </svg>
                        <h3 class="text-xl font-bold text-white font-mono">PARTY POKÉMON (${party.length}/6)</h3>
                    </div>
                </div>

                <div class="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    ${party.map((pokemon, index) => createPokemonCard(pokemon, index + 1)).join('')}
                </div>
            </div>
        `;
    }

    // PC Pokémon
    if (currentBoxPokemon && currentBoxPokemon.length > 0) {
        html += `
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                <div class="bg-gradient-to-r from-blue-500 to-indigo-600 p-4">
                    <div class="flex items-center space-x-3">
                        <svg class="text-white" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
                            <path d="m3.3 7 8.7 5 8.7-5"/>
                            <path d="M12 22V12"/>
                        </svg>
                        <h3 class="text-xl font-bold text-white font-mono">PC BOX (${currentBoxPokemon.length}/${currentBoxCount})</h3>
                    </div>
                </div>

                <div class="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                    ${currentBoxPokemon.map((pokemon, index) => createPokemonCard(pokemon, index + 1, true)).join('')}
                </div>
            </div>
        `;
    }

    // No Pokémon message
    if ((!party || party.length === 0) && (!currentBoxPokemon || currentBoxPokemon.length === 0)) {
        html += `
            <div class="bg-gray-100 dark:bg-gray-800 rounded-xl p-8 text-center">
                <p class="text-gray-500 dark:text-gray-400 font-mono">
                    No Pokémon found in this save file. Start your adventure!
                </p>
            </div>
        `;
    }

    html += '</div>';
    return html;
}

/**
 * Create individual Pokémon card HTML
 */
function createPokemonCard(pokemon, slot, compact = false) {
    const getTypeColor = (type) => {
        const colors = {
            normal: 'from-gray-400 to-gray-500',
            fire: 'from-red-400 to-red-500',
            water: 'from-blue-400 to-blue-500',
            grass: 'from-green-400 to-green-500',
            electric: 'from-yellow-400 to-yellow-500',
            ice: 'from-cyan-400 to-cyan-500',
            fighting: 'from-orange-600 to-orange-700',
            poison: 'from-purple-400 to-purple-500',
            ground: 'from-amber-600 to-amber-700',
            flying: 'from-indigo-400 to-indigo-500',
            psychic: 'from-pink-400 to-pink-500',
            bug: 'from-lime-500 to-lime-600',
            rock: 'from-stone-500 to-stone-600',
            ghost: 'from-violet-600 to-violet-700',
            dragon: 'from-violet-500 to-violet-600'
        };
        return colors[type] || colors.normal;
    };

    const getStatusColor = (status) => {
        if (status === 'OK') return 'text-green-500';
        if (status.includes('Poison')) return 'text-purple-500';
        if (status.includes('Burn')) return 'text-orange-500';
        if (status.includes('Freeze')) return 'text-cyan-500';
        if (status.includes('Paralysis')) return 'text-yellow-500';
        if (status.includes('Sleep')) return 'text-blue-400';
        return 'text-gray-500';
    };

    const nickname = pokemon.nickname || pokemon.speciesName;
    const speciesName = pokemon.speciesName;
    const level = pokemon.level;
    const status = pokemon.status;
    const types = pokemon.types || [pokemon.type1Name, pokemon.type2Name].filter(t => t);

    if (compact) {
        return `
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-xs font-bold text-gray-500 dark:text-gray-400 font-mono">#${slot}</span>
                    <span class="text-xs font-bold ${getStatusColor(status)} font-mono">${status}</span>
                </div>
                <div class="font-bold text-gray-900 dark:text-white font-mono text-sm truncate">${nickname}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400 font-mono">Lv.${level} ${speciesName}</div>
                <div class="flex gap-1 mt-2">
                    ${types.map(type => `
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold text-white bg-gradient-to-r ${getTypeColor(type.toLowerCase())} font-mono">
                            ${type.toUpperCase()}
                        </span>
                    `).join('')}
                </div>
            </div>
        `;
    }

    const currentHp = pokemon.hp || pokemon.currentHp || 0;
    const maxHp = pokemon.maxHp || 1;
    const hpPercent = Math.min(100, (currentHp / maxHp) * 100);
    const ivs = pokemon.iv || {};

    return `
        <div class="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-lg p-4 border-2 border-gray-200 dark:border-gray-600 hover:shadow-lg transition-all hover:-translate-y-1">
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center space-x-2">
                    <span class="w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center text-xs font-bold text-gray-700 dark:text-gray-300 font-mono">
                        ${slot}
                    </span>
                    <span class="font-bold text-gray-900 dark:text-white font-mono">${nickname}</span>
                </div>
                <span class="text-xs font-bold ${getStatusColor(status)} font-mono">${status}</span>
            </div>

            <div class="mb-3">
                <div class="text-sm text-gray-600 dark:text-gray-400 font-mono">${speciesName}</div>
                <div class="text-lg font-bold text-gray-900 dark:text-white font-mono">Level ${level}</div>
            </div>

            <div class="flex gap-1 mb-3">
                ${types.map(type => `
                    <span class="px-2 py-1 rounded text-xs font-bold text-white bg-gradient-to-r ${getTypeColor(type.toLowerCase())} font-mono">
                        ${type.toUpperCase()}
                    </span>
                `).join('')}
            </div>

            <div class="mb-3">
                <div class="flex items-center justify-between text-xs font-mono text-gray-600 dark:text-gray-400 mb-1">
                    <span>HP</span>
                    <span>${currentHp}/${maxHp}</span>
                </div>
                <div class="w-full bg-gray-300 dark:bg-gray-600 rounded-full h-2">
                    <div class="bg-green-500 h-2 rounded-full transition-all" style="width: ${hpPercent}%"></div>
                </div>
            </div>

            <div class="space-y-1">
                <div class="text-xs font-bold text-gray-500 dark:text-gray-400 font-mono uppercase">Moves</div>
                ${pokemon.moves && pokemon.moves.length > 0 
                    ? pokemon.moves.map(move => `
                        <div class="text-xs px-2 py-1 bg-white dark:bg-gray-600 rounded text-gray-700 dark:text-gray-200 font-mono truncate">${move}</div>
                    `).join('')
                    : '<div class="text-xs text-gray-400 font-mono italic">No moves</div>'
                }
            </div>

            <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 grid grid-cols-3 gap-2 text-center">
                <div>
                    <div class="text-[10px] text-gray-500 dark:text-gray-400 font-mono">ATK</div>
                    <div class="text-sm font-bold text-gray-700 dark:text-gray-300 font-mono">${ivs.attack || 0}</div>
                </div>
                <div>
                    <div class="text-[10px] text-gray-500 dark:text-gray-400 font-mono">DEF</div>
                    <div class="text-sm font-bold text-gray-700 dark:text-gray-300 font-mono">${ivs.defense || 0}</div>
                </div>
                <div>
                    <div class="text-[10px] text-gray-500 dark:text-gray-400 font-mono">SPD</div>
                    <div class="text-sm font-bold text-gray-700 dark:text-gray-300 font-mono">${ivs.speed || 0}</div>
                </div>
            </div>
        </div>
    `;
}

// Make available globally
window.createGen1SaveInfo = createGen1SaveInfo;
