import { useState, useCallback } from 'react'
import {
  Header,
  Footer,
  FileOperations,
  TrainerInfo,
  PokemonParty,
  QuickStart,
  PcLanding,
  Gen1SaveInfo
} from './components'
import { parseGen1Save, isGen1Save } from './utils/gen1Parser'

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
  const [gen1Data, setGen1Data] = useState(null)

  // Handle file load from PC Landing page (expects ArrayBuffer and filename)
  const handleFileLoad = useCallback((arrayBuffer, name) => {
    setFileName(name)
    setError(null)
    
    // First, check if this is a Gen 1 save file
    if (isGen1Save(arrayBuffer)) {
      try {
        const parsedData = parseGen1Save(arrayBuffer)
        setGen1Data(parsedData)
        setSaveData({ gen1: true, ...parsedData })
        
        // Update trainer info from parsed data
        if (parsedData.trainer) {
          setTrainerName(parsedData.trainer.name || 'Red')
          setTrainerMoney(parsedData.trainer.money || 3000)
        }
        
        // Load party Pokémon
        if (parsedData.party && parsedData.party.length > 0) {
          setPokemonParty(parsedData.party.slice(0, 6))
        } else {
          setPokemonParty([])
        }
        
        return
      } catch (err) {
        console.warn("Failed to parse Gen 1 save:", err)
        setError('Failed to parse Gen 1 save file. File may be corrupted.')
      }
    }
    
    // Try to decode as text/JSON for compatibility with existing logic
    const decoder = new TextDecoder('utf-8');
    const textContent = decoder.decode(arrayBuffer);
    
    try {
      const data = JSON.parse(textContent)
      setSaveData(data)
      setGen1Data(null)
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
      // If not JSON, we might be dealing with a binary save file
      // For now, we store the buffer and show a message or default state
      console.warn("Non-JSON file detected. Binary parsing not yet implemented, loading default state.")
      setError('Binary save files detected. Currently only JSON saves and Gen 1 saves are fully supported for editing.')
      setSaveData({ binary: true }) // Flag that we have binary data
      setGen1Data(null)
      setPokemonParty([])
      setTrainerName('Unknown')
      setTrainerMoney(0)
    }
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
    if (saveData?.binary) {
       setError('Cannot save: Original file was binary and binary editing is not yet supported.')
       return;
    }

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

  const loadSampleData = useCallback(() => {
    setPokemonParty(samplePokemon.map(p => ({ ...p, level: 50, hp: p.baseStats.hp * 2, maxHp: p.baseStats.hp * 2, attack: p.baseStats.attack * 2, defense: p.baseStats.defense * 2, speed: 50, exp: 10000, moves: ['Tackle', 'Quick Attack'] })))
    setTrainerName('Ash')
    setTrainerMoney(50000)
    setSaveData({ trainer: { name: 'Ash', money: 50000 }, pokemon: samplePokemon })
    setFileName('sample-save.json')
  }, [])

  // If no save data is loaded, show the PC Landing Page
  if (!saveData) {
    return <PcLanding onFileLoad={handleFileLoad} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-50 to-pink-100">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <FileOperations
          fileName={fileName}
          hasSaveData={!!saveData}
          onFileUpload={(e) => {
             // Reuse logic for the file input inside FileOperations if needed, 
             // but primarily we rely on PcLanding now. 
             // This handles if they use the "Change File" button inside FileOperations.
             const file = e.target.files[0]
             if(!file) return;
             const reader = new FileReader();
             reader.onload = (ev) => handleFileLoad(ev.target.result, file.name);
             reader.readAsArrayBuffer(file);
          }}
          onCreateNew={createNewSave}
          onDownload={downloadSaveFile}
          error={error}
        />

        {/* Show Gen 1 Save Info if this is a Gen 1 save */}
        {gen1Data && <Gen1SaveInfo saveData={gen1Data} />}

        {/* Show regular editor components for JSON saves or when not in Gen 1 mode */}
        {!gen1Data && (
          <>
            <TrainerInfo
              trainerName={trainerName}
              trainerMoney={trainerMoney}
              onNameChange={setTrainerName}
              onMoneyChange={setTrainerMoney}
            />

            <PokemonParty
              pokemonParty={pokemonParty}
              availableMoves={availableMoves}
              onUpdatePokemon={updatePokemon}
              onAddPokemon={addPokemon}
              onRemovePokemon={removePokemon}
            />

            <QuickStart onLoadSample={loadSampleData} />
          </>
        )}
      </main>

      <Footer />
    </div>
  )
}

export default App
