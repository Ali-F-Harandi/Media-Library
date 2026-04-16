import { useState, useCallback } from 'react'

const samplePokemon = [
  { id: 1, name: 'Bulbasaur', type: ['grass', 'poison'], baseStats: { hp: 45, attack: 49, defense: 49 } },
  { id: 4, name: 'Charmander', type: ['fire'], baseStats: { hp: 39, attack: 52, defense: 43 } },
  { id: 7, name: 'Squirtle', type: ['water'], baseStats: { hp: 44, attack: 48, defense: 65 } },
  { id: 25, name: 'Pikachu', type: ['electric'], baseStats: { hp: 35, attack: 55, defense: 40 } },
  { id: 150, name: 'Mewtwo', type: ['psychic'], baseStats: { hp: 106, attack: 110, defense: 90 } },
]

const availableMoves = [
  'Tackle', 'Scratch', 'Quick Attack', 'Thunder Shock', 
  'Ember', 'Water Gun', 'Vine Whip', 'Psychic',
  'Hyper Beam', 'Thunderbolt', 'Flamethrower', 'Surf',
  'Earthquake', 'Shadow Ball', 'Ice Beam', 'Brick Break'
]

function App() {
  const [saveData, setSaveData] = useState(null)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState(null)
  const [trainerName, setTrainerName] = useState('Red')
  const [trainerMoney, setTrainerMoney] = useState(3000)
  const [pokemonParty, setPokemonParty] = useState([])

  const handleFileUpload = useCallback((event) => {
    const file = event.target.files[0]
    if (!file) return
    setFileName(file.name)
    setError(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result)
        setSaveData(data)
        if (data.trainer) {
          setTrainerName(data.trainer.name || 'Red')
          setTrainerMoney(data.trainer.money || 3000)
        }
        if (data.pokemon && Array.isArray(data.pokemon)) {
          setPokemonParty(data.pokemon.slice(0, 6))
        } else {
          setPokemonParty([])
        }
      } catch (err) {
        setError('Invalid save file format. Please upload a valid JSON file.')
      }
    }
    reader.onerror = () => setError('Error reading file.')
    reader.readAsText(file)
  }, [])

  const updatePokemon = useCallback((index, updates) => {
    setPokemonParty(prev => {
      const newParty = [...prev]
      newParty[index] = { ...newParty[index], ...updates }
      return newParty
    })
  }, [])

  const addPokemon = useCallback(() => {
    if (pokemonParty.length >= 6) {
      setError('Party is full! Maximum 6 Pokemon allowed.')
      return
    }
    const newPokemon = {
      id: Date.now(),
      name: 'Pikachu',
      level: 5,
      hp: 35,
      maxHp: 35,
      type: ['electric'],
      moves: ['Quick Attack', 'Thunder Shock'],
      attack: 55,
      defense: 40,
      speed: 90,
      exp: 0,
      nickname: ''
    }
    setPokemonParty(prev => [...prev, newPokemon])
  }, [pokemonParty.length])

  const removePokemon = useCallback((index) => {
    setPokemonParty(prev => prev.filter((_, i) => i !== index))
  }, [])

  const downloadSaveFile = useCallback(() => {
    const updatedSaveData = {
      trainer: {
        name: trainerName,
        money: trainerMoney,
        badges: saveData?.trainer?.badges || []
      },
      pokemon: pokemonParty,
      lastModified: new Date().toISOString()
    }
    const blob = new Blob([JSON.stringify(updatedSaveData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `pokemon-save-${Date.now()}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [trainerName, trainerMoney, pokemonParty, saveData])

  const createNewSave = useCallback(() => {
    const newSave = {
      trainer: { name: 'Red', money: 3000, badges: [] },
      pokemon: [],
      created: new Date().toISOString()
    }
    setSaveData(newSave)
    setTrainerName('Red')
    setTrainerMoney(3000)
    setPokemonParty([])
    setFileName('new-save.json')
    setError(null)
  }, [])

  const getTypeColor = (type) => {
    const colors = {
      fire: 'bg-pokemon-fire', water: 'bg-pokemon-water', grass: 'bg-pokemon-grass',
      electric: 'bg-pokemon-electric', psychic: 'bg-pokemon-psychic', ice: 'bg-pokemon-ice',
      dragon: 'bg-pokemon-dragon', dark: 'bg-pokemon-dark', fairy: 'bg-pokemon-fairy',
      normal: 'bg-pokemon-normal', fighting: 'bg-pokemon-fighting', flying: 'bg-pokemon-flying',
      poison: 'bg-pokemon-poison', ground: 'bg-pokemon-ground', rock: 'bg-pokemon-rock',
      bug: 'bg-pokemon-bug', ghost: 'bg-pokemon-ghost', steel: 'bg-pokemon-steel'
    }
    return colors[type] || 'bg-gray-400'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-50 to-pink-100">
      <header className="bg-red-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-4xl font-bold text-center">Pokemon Save Editor</h1>
          <p className="text-center mt-2 text-red-100">Edit your Pokemon save files with ease</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <section className="mb-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">File Operations</h2>
          <div className="flex flex-wrap gap-4 items-center">
            <label className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600">
              <span>Upload Save</span>
              <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
            </label>
            <button onClick={createNewSave} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
              New Save
            </button>
            <button onClick={downloadSaveFile} disabled={!saveData} className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50">
              Download Save
            </button>
            {fileName && <span className="text-gray-600 italic">Current file: {fileName}</span>}
          </div>
          {error && <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">{error}</div>}
        </section>

        <section className="mb-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">Trainer Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trainer Name</label>
              <input type="text" value={trainerName} onChange={(e) => setTrainerName(e.target.value)} maxLength={12} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Enter trainer name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Money</label>
              <input type="number" value={trainerMoney} onChange={(e) => setTrainerMoney(parseInt(e.target.value) || 0)} min={0} max={999999} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Enter money amount" />
            </div>
          </div>
        </section>

        <section className="mb-8 bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-gray-800">Pokemon Party ({pokemonParty.length}/6)</h2>
            <button onClick={addPokemon} disabled={pokemonParty.length >= 6} className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50">Add Pokemon</button>
          </div>
          {pokemonParty.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-xl">No Pokemon in your party yet!</p>
              <p className="mt-2">Click "Add Pokemon" to get started or upload a save file.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pokemonParty.map((pokemon, index) => (
                <div key={pokemon.id || index} className="border border-gray-200 rounded-lg p-4 hover:shadow-lg">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-gray-800">#{String(pokemon.id || index + 1).padStart(3, '0')}</span>
                      <input type="text" value={pokemon.nickname || pokemon.name} onChange={(e) => updatePokemon(index, { nickname: e.target.value })} className="text-xl font-semibold text-gray-800 border-b border-transparent focus:border-blue-500 focus:outline-none bg-transparent" placeholder={pokemon.name} />
                    </div>
                    <button onClick={() => removePokemon(index)} className="text-red-500 hover:text-red-700">X</button>
                  </div>
                  <div className="flex gap-1 mb-3 flex-wrap">
                    {(pokemon.type || []).map((type) => (
                      <span key={type} className={`${getTypeColor(type)} text-white text-xs px-2 py-1 rounded-full capitalize`}>{type}</span>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                    <div><label className="text-xs text-gray-500">Level</label><input type="number" value={pokemon.level || 5} onChange={(e) => updatePokemon(index, { level: parseInt(e.target.value) || 1 })} min={1} max={100} className="w-full px-2 py-1 border border-gray-300 rounded text-center" /></div>
                    <div><label className="text-xs text-gray-500">HP</label><input type="number" value={pokemon.hp || 20} onChange={(e) => updatePokemon(index, { hp: parseInt(e.target.value) || 1 })} min={1} max={pokemon.maxHp || 999} className="w-full px-2 py-1 border border-gray-300 rounded text-center" /></div>
                    <div><label className="text-xs text-gray-500">Max HP</label><input type="number" value={pokemon.maxHp || 20} onChange={(e) => updatePokemon(index, { maxHp: parseInt(e.target.value) || 1 })} min={1} max={999} className="w-full px-2 py-1 border border-gray-300 rounded text-center" /></div>
                    <div><label className="text-xs text-gray-500">Attack</label><input type="number" value={pokemon.attack || 10} onChange={(e) => updatePokemon(index, { attack: parseInt(e.target.value) || 1 })} min={1} max={999} className="w-full px-2 py-1 border border-gray-300 rounded text-center" /></div>
                    <div><label className="text-xs text-gray-500">Defense</label><input type="number" value={pokemon.defense || 10} onChange={(e) => updatePokemon(index, { defense: parseInt(e.target.value) || 1 })} min={1} max={999} className="w-full px-2 py-1 border border-gray-300 rounded text-center" /></div>
                    <div><label className="text-xs text-gray-500">Speed</label><input type="number" value={pokemon.speed || 10} onChange={(e) => updatePokemon(index, { speed: parseInt(e.target.value) || 1 })} min={1} max={999} className="w-full px-2 py-1 border border-gray-300 rounded text-center" /></div>
                  </div>
                  <div className="mb-3">
                    <label className="text-xs text-gray-500 block mb-1">Experience: {pokemon.exp || 0}</label>
                    <input type="range" value={pokemon.exp || 0} onChange={(e) => updatePokemon(index, { exp: parseInt(e.target.value) || 0 })} min={0} max={1000000} step={100} className="w-full" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-2">Moves</label>
                    <div className="space-y-1">
                      {(pokemon.moves || []).map((move, moveIndex) => (
                        <select key={moveIndex} value={move} onChange={(e) => { const newMoves = [...(pokemon.moves || [])]; newMoves[moveIndex] = e.target.value; updatePokemon(index, { moves: newMoves }) }} className="w-full px-2 py-1 border border-gray-300 rounded text-sm">
                          {availableMoves.map((m) => (<option key={m} value={m}>{m}</option>))}
                        </select>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mb-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">Quick Start</h2>
          <p className="text-gray-600 mb-4">Want to try out the editor? Click the button below to load sample Pokemon data!</p>
          <button onClick={() => { setPokemonParty(samplePokemon.map(p => ({ ...p, level: 50, hp: p.baseStats.hp * 2, maxHp: p.baseStats.hp * 2, attack: p.baseStats.attack * 2, defense: p.baseStats.defense * 2, speed: 50, exp: 10000, moves: ['Tackle', 'Quick Attack'] }))); setTrainerName('Ash'); setTrainerMoney(50000); setSaveData({ trainer: { name: 'Ash', money: 50000 }, pokemon: samplePokemon }); setFileName('sample-save.json'); }} className="px-6 py-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600">Load Sample Data</button>
        </section>
      </main>

      <footer className="bg-gray-800 text-white py-6">
        <div className="container mx-auto px-4 text-center">
          <p>2024 Pokemon Save Editor. Built with React & Tailwind CSS.</p>
          <p className="text-gray-400 text-sm mt-2">This is a fan project and is not affiliated with Nintendo or The Pokemon Company.</p>
        </div>
      </footer>
    </div>
  )
}

export default App
