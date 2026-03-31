import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // AGREGA ESTAS LÍNEAS PARA CONECTARLO CON TAURI:
  server: {
    port: 1420,
    strictPort: true,
  }
});