import type { Config } from "tailwindcss";

export default {
  content: [
    "./index.html",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  // The app has its own CSS (jarvis-ui.css); Tailwind is only used for the avatar's utility classes.
  corePlugins: { preflight: false },
  theme: { extend: {} },
  plugins: []
} satisfies Config;
