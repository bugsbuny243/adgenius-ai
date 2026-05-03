import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        ink: '#04050f',
        neon: '#00f2ff',
        cyberPink: '#ff4bd1',
        toxic: '#84ff3d',
        lilac: '#b692ff'
      },
      boxShadow: {
        'neon-cyan': '0 0 0 1px rgba(0,242,255,0.22), 0 0 28px -8px rgba(0,242,255,0.8)',
        'neon-pink': '0 0 0 1px rgba(255,75,209,0.25), 0 0 30px -12px rgba(255,75,209,0.9)'
      },
      keyframes: {
        'boot-grid': {
          '0%': { opacity: '0', transform: 'translateY(10px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' }
        }
      },
      animation: {
        'boot-grid': 'boot-grid 420ms ease-out forwards'
      }
    }
  },
  plugins: []
};

export default config;
