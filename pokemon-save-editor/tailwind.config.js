/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Pokemon type colors
        'pokemon-fire': '#F08030',
        'pokemon-water': '#6890F0',
        'pokemon-grass': '#78C850',
        'pokemon-electric': '#F8D030',
        'pokemon-psychic': '#F85888',
        'pokemon-ice': '#98D8D8',
        'pokemon-dragon': '#7038F8',
        'pokemon-dark': '#705848',
        'pokemon-fairy': '#EE99AC',
        'pokemon-normal': '#A8A878',
        'pokemon-fighting': '#C03028',
        'pokemon-flying': '#A890F0',
        'pokemon-poison': '#A040A0',
        'pokemon-ground': '#E0C068',
        'pokemon-rock': '#B8A038',
        'pokemon-bug': '#A8B820',
        'pokemon-ghost': '#705898',
        'pokemon-steel': '#B8B8D0',
      },
    },
  },
  plugins: [],
}
