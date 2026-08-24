/** @type {import('tailwindcss').Config} */

export default {
  content: ['./src/**/*.{mjs,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--color-bg) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        text: 'rgb(var(--color-text) / <alpha-value>)',
        divider: 'rgb(var(--color-text) / 0.16)',
        accent: {
          DEFAULT: 'rgb(var(--color-accent) / <alpha-value>)',
          700: 'rgb(var(--color-accent-700) / <alpha-value>)'
        },
        neutral: {
          100: 'rgb(var(--color-neutral-100) / <alpha-value>)',
          300: 'rgb(var(--color-neutral-300) / <alpha-value>)',
          900: 'rgb(var(--color-neutral-900) / <alpha-value>)'
        }
      },
      fontFamily: {
        heading: ['"Cormorant Garamond"', 'serif'],
        body: ['Lora', 'serif']
      },
      boxShadow: {
        board: '0 3px 10px rgb(45 43 43 / 0.16)'
      }
    }
  },
  plugins: []
}
