import React from 'react';
import PropTypes from 'prop-types';
import { Badge, Trophy, User, Coins, Box, Heart } from 'lucide-react';

/**
 * Component to display parsed Gen 1 save information
 */
const Gen1SaveInfo = ({ saveData }) => {
  if (!saveData || saveData.generation !== 1) {
    return null;
  }

  const { trainer, party, pcPokemon, pcBoxCount, game } = saveData;

  return (
    <div className="w-full max-w-6xl mx-auto mt-8 px-4 space-y-6">
      {/* Game Info Header */}
      <div className="bg-gradient-to-r from-red-600 to-blue-600 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold font-mono">{game}</h2>
            <p className="text-red-100 text-sm font-mono">Generation I Save Data</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-red-200 font-mono">TRAINER ID</p>
            <p className="text-xl font-bold font-mono">{trainer.id.toString().padStart(5, '0')}</p>
          </div>
        </div>
      </div>

      {/* Trainer Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border-2 border-gray-200 dark:border-gray-700">
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-4">
          <div className="flex items-center space-x-3">
            <User className="text-white" size={28} />
            <h3 className="text-xl font-bold text-white font-mono">TRAINER CARD</h3>
          </div>
        </div>
        
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Name */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 font-mono uppercase">
              Trainer Name
            </label>
            <div className="text-2xl font-bold text-gray-900 dark:text-white font-mono border-b-2 border-gray-300 dark:border-gray-600 pb-2">
              {trainer.name}
            </div>
          </div>

          {/* Money */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 font-mono uppercase flex items-center">
              <Coins size={14} className="mr-1" /> Money
            </label>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400 font-mono border-b-2 border-gray-300 dark:border-gray-600 pb-2">
              ₽{trainer.money.toLocaleString()}
            </div>
          </div>

          {/* Badges */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 font-mono uppercase flex items-center">
              <Trophy size={14} className="mr-1" /> Badges ({trainer.badges.length}/8)
            </label>
            <div className="flex flex-wrap gap-2 pt-1">
              {trainer.badges.length === 0 ? (
                <span className="text-gray-400 text-sm font-mono">No badges yet</span>
              ) : (
                trainer.badges.map((badge, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900 dark:to-yellow-800 text-yellow-800 dark:text-yellow-200 rounded text-xs font-bold font-mono border border-yellow-300 dark:border-yellow-700"
                  >
                    {badge}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Party Pokémon */}
      {party.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border-2 border-gray-200 dark:border-gray-700">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4">
            <div className="flex items-center space-x-3">
              <Heart className="text-white" size={28} />
              <h3 className="text-xl font-bold text-white font-mono">PARTY POKÉMON ({party.length}/6)</h3>
            </div>
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {party.map((pokemon, index) => (
              <PokemonCard key={index} pokemon={pokemon} slot={index + 1} />
            ))}
          </div>
        </div>
      )}

      {/* PC Pokémon */}
      {pcPokemon.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border-2 border-gray-200 dark:border-gray-700">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4">
            <div className="flex items-center space-x-3">
              <Box className="text-white" size={28} />
              <h3 className="text-xl font-bold text-white font-mono">PC BOX ({pcPokemon.length}/{pcBoxCount})</h3>
            </div>
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
            {pcPokemon.map((pokemon, index) => (
              <PokemonCard key={index} pokemon={pokemon} slot={index + 1} compact />
            ))}
          </div>
        </div>
      )}

      {/* No Pokémon message */}
      {party.length === 0 && pcPokemon.length === 0 && (
        <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400 font-mono">
            No Pokémon found in this save file. Start your adventure!
          </p>
        </div>
      )}
    </div>
  );
};

/**
 * Individual Pokémon card component
 */
const PokemonCard = ({ pokemon, slot, compact = false }) => {
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

  if (compact) {
    return (
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 font-mono">#{slot}</span>
          <span className={`text-xs font-bold ${getStatusColor(pokemon.status)} font-mono`}>
            {pokemon.status}
          </span>
        </div>
        <div className="font-bold text-gray-900 dark:text-white font-mono text-sm truncate">
          {pokemon.nickname}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
          Lv.{pokemon.level} {pokemon.name}
        </div>
        <div className="flex gap-1 mt-2">
          {pokemon.types.map((type, idx) => (
            <span
              key={idx}
              className={`px-2 py-0.5 rounded text-[10px] font-bold text-white bg-gradient-to-r ${getTypeColor(type)} font-mono`}
            >
              {type.toUpperCase()}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-lg p-4 border-2 border-gray-200 dark:border-gray-600 hover:shadow-lg transition-all hover:-translate-y-1">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center text-xs font-bold text-gray-700 dark:text-gray-300 font-mono">
            {slot}
          </span>
          <span className="font-bold text-gray-900 dark:text-white font-mono">
            {pokemon.nickname}
          </span>
        </div>
        <span className={`text-xs font-bold ${getStatusColor(pokemon.status)} font-mono`}>
          {pokemon.status}
        </span>
      </div>

      {/* Species and Level */}
      <div className="mb-3">
        <div className="text-sm text-gray-600 dark:text-gray-400 font-mono">
          {pokemon.name}
        </div>
        <div className="text-lg font-bold text-gray-900 dark:text-white font-mono">
          Level {pokemon.level}
        </div>
      </div>

      {/* Types */}
      <div className="flex gap-1 mb-3">
        {pokemon.types.map((type, idx) => (
          <span
            key={idx}
            className={`px-2 py-1 rounded text-xs font-bold text-white bg-gradient-to-r ${getTypeColor(type)} font-mono`}
          >
            {type.toUpperCase()}
          </span>
        ))}
      </div>

      {/* HP */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs font-mono text-gray-600 dark:text-gray-400 mb-1">
          <span>HP</span>
          <span>{pokemon.currentHp}/{pokemon.maxHp}</span>
        </div>
        <div className="w-full bg-gray-300 dark:bg-gray-600 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all"
            style={{ width: `${Math.min(100, (pokemon.currentHp / pokemon.maxHp) * 100)}%` }}
          ></div>
        </div>
      </div>

      {/* Moves */}
      <div className="space-y-1">
        <div className="text-xs font-bold text-gray-500 dark:text-gray-400 font-mono uppercase">Moves</div>
        {pokemon.moves.length > 0 ? (
          pokemon.moves.map((move, idx) => (
            <div
              key={idx}
              className="text-xs px-2 py-1 bg-white dark:bg-gray-600 rounded text-gray-700 dark:text-gray-200 font-mono truncate"
            >
              {move}
            </div>
          ))
        ) : (
          <div className="text-xs text-gray-400 font-mono italic">No moves</div>
        )}
      </div>

      {/* Stats Preview */}
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">ATK</div>
          <div className="text-sm font-bold text-gray-700 dark:text-gray-300 font-mono">{pokemon.ivs.attack}</div>
        </div>
        <div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">DEF</div>
          <div className="text-sm font-bold text-gray-700 dark:text-gray-300 font-mono">{pokemon.ivs.defense}</div>
        </div>
        <div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">SPD</div>
          <div className="text-sm font-bold text-gray-700 dark:text-gray-300 font-mono">{pokemon.ivs.speed}</div>
        </div>
      </div>
    </div>
  );
};

Gen1SaveInfo.propTypes = {
  saveData: PropTypes.shape({
    generation: PropTypes.number.isRequired,
    game: PropTypes.string.isRequired,
    trainer: PropTypes.shape({
      name: PropTypes.string.isRequired,
      id: PropTypes.number.isRequired,
      money: PropTypes.number.isRequired,
      badges: PropTypes.arrayOf(PropTypes.string).isRequired
    }).isRequired,
    party: PropTypes.array.isRequired,
    pcPokemon: PropTypes.array.isRequired,
    pcBoxCount: PropTypes.number.isRequired
  }).isRequired
};

PokemonCard.propTypes = {
  pokemon: PropTypes.shape({
    nickname: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    level: PropTypes.number.isRequired,
    currentHp: PropTypes.number.isRequired,
    maxHp: PropTypes.number.isRequired,
    status: PropTypes.oneOfType([PropTypes.string, PropTypes.array]).isRequired,
    types: PropTypes.arrayOf(PropTypes.string).isRequired,
    moves: PropTypes.arrayOf(PropTypes.string).isRequired,
    ivs: PropTypes.shape({
      attack: PropTypes.number.isRequired,
      defense: PropTypes.number.isRequired,
      speed: PropTypes.number.isRequired
    }).isRequired
  }).isRequired,
  slot: PropTypes.number.isRequired,
  compact: PropTypes.bool
};

export default Gen1SaveInfo;
