import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'dpw-gold':      '#B8960C',
        'dpw-gold-light':'#D4AF37',
        'dpw-gold-pale': '#FDF6E3',
        'dpw-dark':      '#1a1612',
        'dpw-bg':        '#faf8f3',
        'dpw-border':    '#e8dfc8',
        'dpw-text':      '#2c2416',
        'dpw-muted':     '#9c8f6f',
        'dpw-mid':       '#6b5d3f',
        'dpw-green':     '#2d7a4e',
        'dpw-blue':      '#2d5a8a',
        // legacy compat
        'dpw-light':     '#faf8f3',
      },
      fontFamily: {
        sans:  ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-cormorant)', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
export default config
