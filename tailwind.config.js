module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './pages/**/*.{ts,tsx,js,jsx}',
    './components/**/*.{ts,tsx,js,jsx}'
  ],
  theme: {
    extend: {
      colors: {
        burgundy: {
          900: '#5E0006',
          800: '#7B0F14',
          700: '#A1161F',
          600: '#C02624',
        },
        burnt: {
          700: '#D03A0E',
          600: '#E14A12',
          500: '#F06421',
        },
        beige: {
          100: '#ECD8C0'
        }
      }
    }
  },
  plugins: [],
}
