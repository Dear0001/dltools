/**
 * Theme colours are CSS variables (see src/styles/tailwind.css). `withAlpha`
 * wraps them in color-mix() so opacity modifiers such as `bg-primary/10`
 * generate real CSS; plain `var(--x)` values silently drop those classes.
 */
const withAlpha = (variable) => `color-mix(in srgb, var(${variable}) calc(<alpha-value> * 100%), transparent)`;

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    container: {
      center: true,
      padding: '1rem',
    },
    extend: {
      colors: {
        background: { DEFAULT: withAlpha('--background'), secondary: withAlpha('--background-secondary') },
        surface: { DEFAULT: withAlpha('--surface') },
        success: { DEFAULT: withAlpha('--success') },
        warning: { DEFAULT: withAlpha('--warning') },
        error: { DEFAULT: withAlpha('--error') },
        editor: { DEFAULT: withAlpha('--editor') },
        overlay: { DEFAULT: withAlpha('--overlay') },
        foreground: { DEFAULT: withAlpha('--foreground') },
        primary: {
          DEFAULT: withAlpha('--primary'),
          foreground: withAlpha('--primary-foreground'),
        },
        secondary: {
          DEFAULT: withAlpha('--background-secondary'),
          foreground: withAlpha('--secondary-foreground'),
        },
        accent: {
          DEFAULT: withAlpha('--accent'),
          foreground: withAlpha('--accent-foreground'),
        },
        muted: {
          DEFAULT: withAlpha('--muted'),
          foreground: withAlpha('--muted-foreground'),
        },
        card: {
          DEFAULT: withAlpha('--surface'),
          foreground: withAlpha('--card-foreground'),
        },
        border: { DEFAULT: withAlpha('--border'), strong: withAlpha('--border-strong') },
        input: { DEFAULT: withAlpha('--input') },
        ring: { DEFAULT: withAlpha('--ring') },
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        sm: 'calc(var(--radius) - 2px)',
        lg: 'calc(var(--radius) + 2px)',
        xl: 'calc(var(--radius) + 4px)',
        '2xl': 'calc(var(--radius) + 8px)',
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px' }],
      },
      animation: {
        'fade-in': 'fadeIn 200ms ease forwards',
        'slide-up': 'slideUp 250ms ease forwards',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      boxShadow: {
        card: '0 1px 2px rgb(var(--shadow-color) / 0.05)',
        'card-hover': '0 8px 24px -8px rgb(var(--shadow-color) / 0.16)',
        popover: '0 12px 32px -8px rgb(var(--shadow-color) / 0.22)',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};