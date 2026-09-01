/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
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
          50: "#f6f7f6",
          100: "#eef1ee",
          400: "#8da294",
          500: "#5c6b60",
          600: "#3d4a40",
          700: "#2a332c",
          800: "#1c231e",
          900: "#141a16",
          950: "#0e1210",
        },
      },
      fontFamily: {
        sans: ["Geist"],
        arabic: ["Noto Naskh Arabic"],
        mono: ["monospace"],
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
