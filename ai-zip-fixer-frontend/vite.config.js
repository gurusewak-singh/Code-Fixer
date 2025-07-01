import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from 'tailwindcss' // Import tailwindcss directly
import autoprefixer from 'autoprefixer' // Import autoprefixer

// https://vite.dev/config/
export default defineConfig({
  // Add the postcss-css config here
  css: {
    postcss: {
      plugins: [
        tailwindcss,
        autoprefixer,
      ],
    },
  },
  plugins: [react()],
})