import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        midnight: '#0A1628',
        deep: '#0D2844',
        'jinden-blue': '#1565C0',
        vox: '#2196F3',
        sky: '#42A5F5',
        wash: '#90CAF9',
        mist: '#E3F2FD',
        paper: '#F8FAFD',
        torch: '#E65100',
        'torch-light': '#FF8A50',
        ink: '#1A1A1A',
        stale: '#7C3AED',
        'stale-bg': '#F5F3FF',
      },
      fontFamily: {
        brand: ['Cormorant Garamond', 'serif'],
        serif: ['Noto Serif JP', 'serif'],
        sans: ['Noto Sans JP', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
