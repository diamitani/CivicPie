const config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#001B3D',
          900: '#001B3D',
          800: '#0A2A4A',
          700: '#1C3A5E',
        },
        red: {
          DEFAULT: '#C41230',
          hover: '#E8243E',
          dim: '#8B0D22',
        },
        gold: {
          DEFAULT: '#E8A030',
          light: '#F5BE6A',
          dim: '#B87818',
        },
        cream: {
          DEFAULT: '#F5EDD8',
          dark: '#EDE0C4',
        },
        stone: {
          DEFAULT: '#6B7280',
          light: '#9BA3AF',
        },
      },
      fontFamily: {
        display: ["'Montserrat'", 'sans-serif'],
        serif: ["'Lora'", 'serif'],
        body: ["'Inter'", 'sans-serif'],
      },
      borderRadius: {
        pill: '100px',
      },
    },
  },
  plugins: [],
};

export default config;
