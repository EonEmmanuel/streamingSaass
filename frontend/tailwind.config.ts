import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#ffffff',
        foreground: '#1a1919',
        card: '#ffffff',
        muted: '#f4f4f4',
        accent: '#00adef',
        vimeo: {
          blue: '#00adef',
          purple: '#7d38ff',
          gray: '#4a4a4a',
          lightGray: '#f4f4f7',
          border: '#e8e8e8'
        }
      },
      boxShadow: {
        vimeo: '0 2px 4px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.08)',
        glass: '0 8px 32px rgba(0,0,0,0.35)'
      }
    }
  },
  plugins: []
} satisfies Config;
