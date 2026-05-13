/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#0f172a', // Midnight Blue / Sleek Black
          600: '#334155',
          700: '#1e293b',
          800: '#0f172a',
          900: '#020617',
        },
        background: '#f9fafb', // subtle gray
        surface:    '#ffffff', // crisp stark white
        'input-bg': '#ffffff',
        foreground: '#09090b', // Deep Zinc
        muted:      '#64748b', // Slate 500
        border:     '#e2e8f0', // Slate 200
        accent:     '#2563eb', // Blue 600
        success:    '#10b981',
        warning:    '#f59e0b',
        error:      '#ef4444',
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      animation: {
        'fade-in':   'fadeIn 0.25s ease-out',
        'slide-up':  'slideUp 0.35s cubic-bezier(0.32,0.72,0,1)',
        'sheet-up':  'sheetUp 0.4s cubic-bezier(0.32,0.72,0,1)',
        'scale-in':  'scaleIn 0.2s ease-out',
        'pulse-slow': 'pulse 2.5s cubic-bezier(0.4,0,0.6,1) infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(20px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        sheetUp: { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        scaleIn: { from: { opacity: '0', transform: 'scale(0.95)' }, to: { opacity: '1', transform: 'scale(1)' } },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
