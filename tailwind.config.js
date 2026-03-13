/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
        serif: ['var(--font-playfair)', 'serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
      },
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        // Warm food-inspired color palette - Editorial redesign
        terracotta: {
          50: '#FDF7F5',
          100: '#F9EAE5',
          200: '#F2CDCA',
          300: '#E4A29B',
          400: '#D5736A',
          500: '#C84B31',
          600: '#A43A24',
          700: '#812E1D',
          800: '#64261A',
          900: '#532219',
        },
        sage: {
          50: '#F8F9F8',
          100: '#ECEEEC',
          200: '#D4D8D4',
          300: '#B5BCB5',
          400: '#959D95',
          500: '#828F82',
          600: '#626D62',
          700: '#4D564D',
          800: '#3F463F',
          900: '#363C36',
        },
        cream: {
          50: '#fefdfb',
          100: '#fdf9f0',
          200: '#faf2d9',
          300: '#f6e8bb',
          400: '#f0d894',
          500: '#e9c66a',
          600: '#d9a846',
          700: '#b8852f',
          800: '#966a29',
          900: '#7b5726',
        },
        coral: {
          50: '#fff4f2',
          100: '#ffe5e0',
          200: '#ffd0c7',
          300: '#ffafa0',
          400: '#ff8069',
          500: '#ff5a3d',
          600: '#f03c1d',
          700: '#c82d13',
          800: '#a52816',
          900: '#882718',
        },
      },
    },
  },
  plugins: [],
}
