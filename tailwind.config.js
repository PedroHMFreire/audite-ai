/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primary: Laranja
        primary: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FFE8D6',
          300: '#FFC9A3',
          400: '#FF6B35',
          500: '#FF6B35',
          600: '#E55A28',
          700: '#D94E1F',
          800: '#C23415',
          900: '#8B3A1A',
        },
        // Secondary: Azul
        secondary: {
          50: '#F0F9FF',
          100: '#E0F2FE',
          200: '#BAE6FD',
          300: '#7DD3FC',
          400: '#0284C7',
          500: '#004E89',
          600: '#0066B2',
          700: '#0055A0',
          800: '#004C8C',
          900: '#003D7A',
        },
        // Semantic colors
        success: '#06B6D4',
        warning: '#FBBF24',
        danger: '#EF4444',
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'Avenir', 'Helvetica', 'Arial', 'sans-serif'],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2rem', { lineHeight: '2.5rem' }],
        '5xl': ['2.5rem', { lineHeight: '3rem' }],
      },
      spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
        '2xl': '3rem',
      },
      borderRadius: {
        'xs': '0.25rem',
        'sm': '0.375rem',
        'base': '0.5rem',
        'md': '0.75rem',
        'lg': '1rem',
        'xl': '1.25rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
        'full': '9999px',
      },
      boxShadow: {
        'xs': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'sm': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'base': '0 4px 12px -2px rgb(0 0 0 / 0.1)',
        'md': '0 10px 25px -5px rgb(0 0 0 / 0.1)',
        'lg': '0 20px 50px -10px rgb(0 0 0 / 0.15)',
      },
    }
  },
  plugins: []
}
