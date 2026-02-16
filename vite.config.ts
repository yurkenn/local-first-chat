import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Polyfill Node.js modules for simple-peer in browser
      events: "events",
      util: "util",
    },
  },

  // Polyfill Node.js globals for packages like simple-peer
  define: {
    global: "globalThis",
  },

  // Suppress externalization of Node.js built-ins used by simple-peer
  optimizeDeps: {
    include: ["events", "util"],
  },

  // Code-splitting for optimal bundle sizes
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        landing: path.resolve(__dirname, "landing.html"),
      },
      output: {
        manualChunks(id) {
          // Core cojson CRDT engine (largest part)
          if (id.includes("cojson") && !id.includes("jazz")) {
            return "vendor-cojson";
          }
          // Jazz framework (depends on cojson + react)
          if (id.includes("jazz-tools") || id.includes("jazz-react")) {
            return "vendor-jazz";
          }
          // React + ReactDOM (keep together to avoid circular deps)
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom") || id.includes("scheduler")) {
            return "vendor-react";
          }
          // WebRTC / P2P networking
          if (id.includes("simple-peer") || id.includes("webrtc")) {
            return "vendor-webrtc";
          }
          // Radix UI primitives
          if (id.includes("@radix-ui")) {
            return "vendor-radix";
          }
          // Crypto & encoding utils
          if (id.includes("@noble") || id.includes("@scure") || id.includes("base-x") || id.includes("bs58")) {
            return "vendor-crypto";
          }
        },
      },
    },
  },

  // Vite options tailored for Tauri development
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
        protocol: "ws",
        host,
        port: 1421,
      }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));
