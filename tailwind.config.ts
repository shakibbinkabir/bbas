import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#006A4E',
          hover: '#004D38',
          light: '#10B981',
          'light-hover': '#34D399',
        },
        background: {
          DEFAULT: 'hsl(var(--background))',
          primary: { DEFAULT: '#FFFFFF', dark: '#0F172A' },
          secondary: { DEFAULT: '#F8FAFC', dark: '#1E293B' },
        },
        foreground: {
          DEFAULT: 'hsl(var(--foreground))',
          primary: { DEFAULT: '#0F172A', dark: '#F8FAFC' },
          secondary: { DEFAULT: '#64748B', dark: '#94A3B8' },
        },
        success: { DEFAULT: '#16A34A', dark: '#22C55E' },
        warning: { DEFAULT: '#D97706', dark: '#F59E0B' },
        error: { DEFAULT: '#DC2626', dark: '#EF4444' },
        border: {
          DEFAULT: 'hsl(var(--border))',
          dark: '#334155',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'var(--font-bengali)', 'system-ui', 'sans-serif'],
        bengali: ['var(--font-bengali)', 'var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
export default config;
