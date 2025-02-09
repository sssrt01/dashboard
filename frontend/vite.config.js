import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        host: true, // Указывает на "0.0.0.0" для доступа извне контейнера
        watch: {
            usePolling: true, // Включает опрос файловой системы
        },
    },
});
