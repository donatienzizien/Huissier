/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Encre - couleur de marque principale (sceau, sidebar, actions),
        // utilisee par la sidebar/recherche/alertes
        // Bleu marine - couleur institutionnelle principale
        navy: {
          50: '#F1F5F9',
          100: '#E2E8F0',
          200: '#CBD5E1',
          300: '#94A3B8',
          400: '#64748B',
          500: '#475569',
          600: '#334155',
          700: '#1E293B',
          800: '#172033',
          900: '#0F172A',
          950: '#020617',
        },
        ink: {
          50: '#FBF1E8',
          100: '#F3DAC0',
          200: '#E8B98A',
          300: '#DB9B5C',
          500: '#CA7223',
          600: '#A85C1B',
          700: '#8A4B16',
          800: '#6B3A11',
          900: '#4D2A0D',
          950: '#331C08',
        },
        // Laiton - accent chaud evoquant le sceau officiel de l'huissier
        brass: {
          50: '#FBF6E9',
          100: '#F1E6C3',
          200: '#E4CD8D',
          300: '#D2B767',
          500: '#B08D3E',
          600: '#96762E',
          700: '#7A5F24',
          900: '#4A3915',
        },
        // Papier - neutres chauds qui remplacent le gris froid par defaut
        gray: {
          50: '#FAF8F4',
          100: '#F3F0E8',
          200: '#E7E2D6',
          300: '#D7D0BE',
          400: '#B3AA92',
          500: '#8C816A',
          600: '#6B6252',
          700: '#524A3D',
          800: '#3A342B',
          900: '#24211B',
        },
        // Or (alias) - meme famille que brass, avec la nuance 400 ajoutee
        gold: {
          50: '#FBF6E9',
          100: '#F1E6C3',
          200: '#E4CD8D',
          300: '#D2B767',
          400: '#C0A250',
          500: '#B08D3E',
          600: '#96762E',
          700: '#7A5F24',
          900: '#4A3915',
        },
        // Parchemin (alias) - meme famille que gray/papier
        parchment: {
          50: '#FAF8F4',
          100: '#F3F0E8',
        },
        // Lie-de-vin - couleur d'alerte/erreur (factures en retard)
        wine: {
          50: '#FBEAEA',
          100: '#F5CFCF',
          500: '#9B2C2C',
          600: '#7F1D1D',
          700: '#651414',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['"Source Serif 4"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};


