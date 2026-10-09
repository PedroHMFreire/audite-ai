/*
 * Sistema visual do Audite: neutros frios + azul-cobalto como cor da marca e
 * de ação. Verde, âmbar e vermelho ficam reservados para status: certo, sobra
 * e falta.
 *
 * Toda cor é uma variável CSS (definida em src/styles.css), com um valor para
 * o tema claro e outro para o escuro. Por isso `bg-white` é "superfície" e
 * `text-ink` é "texto": no tema escuro as escalas se invertem sozinhas, sem
 * precisar de variantes `dark:` nas telas.
 *
 * As paletas "coloridas" do Tailwind usadas pelo código legado (orange, blue,
 * purple...) são apontadas para a escala neutra, para que nenhuma tela saia do
 * sistema.
 */
const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`
const scale = (name) => Object.fromEntries(SHADES.map((s) => [s, v(`${name}-${s}`)]))

const neutral = scale('n')
const positive = scale('pos')
const caution = scale('cau')
const negative = scale('neg')

const ink = {
  50: v('n-100'), 100: v('n-100'), 200: v('n-200'), 300: v('n-300'), 400: v('n-600'),
  500: v('ink'), 600: v('n-800'), 700: v('n-800'), 800: v('n-900'), 900: v('n-950'), 950: v('n-950'),
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // O tema vem de <html data-theme>, aplicado por public/theme.js antes da primeira pintura.
  darkMode: ['selector', '[data-theme="dark"]'],
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
        success: v('pos-500'),
        warning: v('cau-500'),
        danger: v('neg-500'),
        white: v('surface'),
        paper: v('paper'),
        ink: v('ink'),
        // `brand` preenche botões e blocos (texto por cima sempre `brand-on`);
        // `brand-text` é o azul legível como texto sobre o fundo de cada tema.
        brand: { DEFAULT: v('brand'), hover: v('brand-hover'), text: v('brand-text'), soft: v('brand-soft'), on: '#FFFFFF' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Helvetica', 'Arial', 'sans-serif'],
        display: ['"Bricolage Grotesque"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        xs: '0 1px 1px 0 rgb(var(--shadow) / 0.03)',
        sm: '0 1px 2px 0 rgb(var(--shadow) / 0.05)',
        DEFAULT: '0 1px 2px 0 rgb(var(--shadow) / 0.05)',
        base: '0 2px 8px -2px rgb(var(--shadow) / 0.08)',
        md: '0 4px 14px -4px rgb(var(--shadow) / 0.10)',
        lg: '0 12px 32px -12px rgb(var(--shadow) / 0.18)',
        xl: '0 20px 48px -16px rgb(var(--shadow) / 0.22)',
        '2xl': '0 28px 64px -20px rgb(var(--shadow) / 0.28)',
      },
    },
  },
  plugins: [],
}
