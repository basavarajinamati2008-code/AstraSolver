/** @type {import('tailwindcss').Config} */
export default {
  // Scan all files in src/ for class usage
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // CivicPulse brand colours
      colors: {
        navy: {
          DEFAULT: '#0B1F3A',
          light: '#132D52',
          dark: '#07142A',
        },
        civic: {
          bg: '#F3F5F8',        // page background
          accent: '#2563EB',    // blue accent
          'accent-hover': '#1D4ED8',
        },
        priority: {
          low: '#94A3B8',       // grey-blue
          medium: '#3B82F6',    // blue
          high: '#F97316',      // orange
          critical: '#EF4444',  // red
          resolved: '#22C55E',  // green
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        }
      }
    },
  },
  plugins: [
    // tailwindcss-animate enables Radix UI / shadcn animations
    require('tailwindcss-animate'),
  ],
}
