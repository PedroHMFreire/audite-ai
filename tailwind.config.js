import colors from 'tailwindcss/colors'

/*
 * Sistema visual do Audite: neutros quentes + tinta (quase preto) como única
 * cor de ação. Cor de verdade só aparece para status: certo, falta e sobra.
 *
 * As paletas "coloridas" do Tailwind usadas pelo código legado (orange, blue,
 * purple...) são apontadas para a escala de tinta, e os cinzas para a escala
 * neutra, para que nenhuma tela saia do sistema.
 */
const neutral = {
  50: '#FAFAF8',
  100: '#F4F3F0',
  200: '#E7E5E0',
  300: '#D4D1CA',
  400: '#A29E96',
  500: '#75716A',
  600: '#55524C',
  700: '#3D3B36',
  800: '#262522',
  900: '#161614',
  950: '#0B0B0A',
}

const ink = {
  50: '#F4F3F0',
  100: '#EDEBE7',
  200: '#DEDBD4',
  300: '#C4C0B8',
  400: '#55524C',
  500: '#161614',
  600: '#2E2D29',
  700: '#262522',
  800: '#161614',
  900: '#0B0B0A',
  950: '#0B0B0A',
}

const positive = {
  ...colors.emerald,
  50: '#EEF7F2',
  100: '#DCEFE5',
  500: '#1F8A5F',
  600: '#17734E',
  700: '#125C3F',
  800: '#0F4A33',
}

const caution = {
  ...colors.amber,
  50: '#FBF5E9',
  100: '#F6EACF',
  500: '#B7791F',
  600: '#9A6417',
  700: '#7C5012',
  800: '#63400F',
}

const negative = {
  ...colors.red,
  50: '#FBF0EE',
  100: '#F7DEDA',
  500: '#C2412D',
  600: '#A83524',
  700: '#8A2B1D',
  800: '#6F2318',
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // O app é somente claro. "class" mantém as variantes dark: inativas.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        zinc: neutral,
        gray: neutral,
        slate: neutral,
        stone: neutral,
        neutral,
        primary: ink,
        secondary: ink,
        orange: ink,
        blue: ink,
        indigo: ink,
        purple: ink,
        violet: ink,
        cyan: ink,
        sky: ink,
        green: positive,
        emerald: positive,
        teal: positive,
        yellow: caution,
        amber: caution,
        red: negative,
        rose: negative,
        success: positive[500],
        warning: caution[500],
        danger: negative[500],
        paper: '#FAFAF8',
        ink: '#161614',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Helvetica', 'Arial', 'sans-serif'],
        display: ['"Instrument Serif"', 'Georgia', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        xs: '0 1px 1px 0 rgb(22 22 20 / 0.03)',
        sm: '0 1px 2px 0 rgb(22 22 20 / 0.05)',
        DEFAULT: '0 1px 2px 0 rgb(22 22 20 / 0.05)',
        base: '0 2px 8px -2px rgb(22 22 20 / 0.08)',
        md: '0 4px 14px -4px rgb(22 22 20 / 0.10)',
        lg: '0 12px 32px -12px rgb(22 22 20 / 0.18)',
        xl: '0 20px 48px -16px rgb(22 22 20 / 0.22)',
        '2xl': '0 28px 64px -20px rgb(22 22 20 / 0.28)',
      },
    },
  },
  plugins: [],
}
