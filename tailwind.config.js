/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./app/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        forest: {
          50: "#f0f7f4",
          100: "#dcede6",
          500: "#1a6b3c",
          600: "#155732",
          700: "#0f4126",
          900: "#07200f",
        },
        sand: {
          50: "#fafaf7",
          100: "#f5f3ec",
          200: "#eae6d9",
          300: "#d9d3c0",
        },
        clay: {
          400: "#c2754a",
          500: "#a85c35",
          600: "#8c4a29",
        },
        ink: {
          100: "#eef1ee",
          500: "#5c6b60",
          700: "#2a332c",
          800: "#1c231e",
          900: "#141a16",
          950: "#0e1210",
        },
      },
      fontFamily: {
        sans: ["Geist", "system-ui", "sans-serif"],
        arabic: ["Noto Naskh Arabic", "serif"],
        mono: ["GeistMono", "ui-monospace", "monospace"],
      },
      fontSize: {
        display: "24px",
        title: "18px",
        label: "13px",
      },
    },
  },
  plugins: [],
};
