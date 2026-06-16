import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#C75C3A',
          dark: '#A54326',
        },
        secondary: '#E8D9C6',
        dark: '#1E1B1A',
        accent: '#D9A13B',
        success: '#2A7A3E',
        error: '#B33C2E',
        info: '#2A6B8F',
        neutral: '#5A4A42',
        border: '#D6CFC4',
        background: '#FCFAF5',
        card: '#FFFFFF',
      },
      fontFamily: {
        serif: ['var(--font-playfair)', 'Playfair Display', 'Georgia', 'serif'],
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        18: '4.5rem', // 72px
      },
    },
  },
  plugins: [],
};
export default config;
