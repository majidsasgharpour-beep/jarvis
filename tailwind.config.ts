import type { Config } from "tailwindcss";

export default {
  darkMode:["class"],
  content:["./index.html","./components/**/*.{ts,tsx}","./src/**/*.{ts,tsx}","./demo.tsx"],
  theme:{extend:{}},
  plugins:[]
} satisfies Config;