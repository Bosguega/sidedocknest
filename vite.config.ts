import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // Prevent vite from obscuring Rust errors
  clearScreen: false,

  // Tauri expects a fixed port
  server: {
    port: 5173,
    strictPort: true,
  },

  // Env variables starting with TAURI_ are available in the client
  envPrefix: ["VITE_", "TAURI_"],

  build: {
    // Tauri uses Chromium on Windows
    target: "chrome105",
    // Don't minify in debug builds
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    // Produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_DEBUG,
  },
});
