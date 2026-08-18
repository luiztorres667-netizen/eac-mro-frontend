import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Para deploy no GitHub Pages em subpath
  // base: '/EAC-MRO/',
});
