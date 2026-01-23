import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    root: '.', // Project root is the current directory
    build: {
        outDir: 'dist', // Output directory
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                admin: resolve(__dirname, 'admin.html'),
                conciertos: resolve(__dirname, 'conciertos.html'),
                creativo: resolve(__dirname, 'creativo.html'),
                documental: resolve(__dirname, 'documental.html'),
                gastronomia: resolve(__dirname, 'gastronomia.html'),
                inmobiliaria: resolve(__dirname, 'inmobiliaria.html'),
                moda: resolve(__dirname, 'moda.html'),
                musical: resolve(__dirname, 'musical.html'),
                otros: resolve(__dirname, 'otros.html'),
                restauracion: resolve(__dirname, 'restauracion.html')
            }
        }
    },
    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:3000', // Forward API requests to Express server
                changeOrigin: true
            }
        }
    }
});
