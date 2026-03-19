
  import { defineConfig } from 'vite';
  import react from '@vitejs/plugin-react-swc';
  import path from 'path';

  export default defineConfig({
    plugins: [react()],
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      alias: {
        'figma:asset/dbcafdef0ac186a5899ea330b772ebed92102e94.png': path.resolve(__dirname, './src/assets/dbcafdef0ac186a5899ea330b772ebed92102e94.png'),
        'figma:asset/95e6c5b4973e509936b150ccfbaf13e204a809d2.png': path.resolve(__dirname, './src/assets/95e6c5b4973e509936b150ccfbaf13e204a809d2.png'),
        'figma:asset/68704da2cc678fcc5a8312226b6a3dd981d64a36.png': path.resolve(__dirname, './src/assets/68704da2cc678fcc5a8312226b6a3dd981d64a36.png'),
        'figma:asset/11c35ecc787921c17da6c0734e60fe06c3481c08.png': path.resolve(__dirname, './src/assets/11c35ecc787921c17da6c0734e60fe06c3481c08.png'),
        'figma:asset/0618420b21af33954d02338a79238933b9dc0e0e.png': path.resolve(__dirname, './src/assets/0618420b21af33954d02338a79238933b9dc0e0e.png'),
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      target: 'esnext',
      outDir: 'build',
    },
    server: {
      port: 3000,
      open: true,
    },
  });