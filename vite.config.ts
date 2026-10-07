import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(process.cwd(), ".") } },
  build: {
    lib: {
      entry: path.resolve(process.cwd(), "src/jarvis-prompt.tsx"),
      formats: ["es"],
      fileName: () => "prompt-box.js"
    },
    outDir: "react-dist",
    emptyOutDir: true,
    cssCodeSplit: false
  }
});
