import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#04050f',
        neon: '#66e3ff',
        lilac: '#b692ff'
      }
    }
  },
  plugins: []
};

export default config;
