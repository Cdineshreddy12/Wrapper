import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    conditions: ['import', 'module', 'default'],
  },
  plugins: [
    {
      name: 'resolve-ts-from-js',
      resolveId(source, importer) {
        if (source.endsWith('.js') && importer) {
          return source.replace(/\.js$/, '.ts');
        }
        return null;
      },
    },
  ],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.{ts,js}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
        '**/*.config.{js,ts}',
        '**/migrations/**',
        '**/scripts/**'
      ]
    }
  }
});
