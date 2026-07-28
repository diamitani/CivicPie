const config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#0a1628',
          800: '#0f1f3d',
          700: '#132042',
          600: '#1a2d56',
        },
        gold: {
          400: '#c9a227',
          300: '#d4b03a',
        },
        'cp-blue': '#2563eb',
        'cp-teal': '#0d9488',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
