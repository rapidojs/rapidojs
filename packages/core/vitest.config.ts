import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

export default defineConfig({
  plugins: [
    // Use SWC instead of esbuild for better decorator and DI support
    swc.vite({
      jsc: {
        parser: {
          syntax: 'typescript',
          decorators: true,
          dynamicImport: true
        },
        transform: {
          decoratorMetadata: true,
          legacyDecorator: true
        },
        target: 'es2022',
        keepClassNames: true,
        preserveAllComments: false
      },
      minify: false,
      sourceMaps: true,
      inlineSourcesContent: true,
      module: {
        type: 'es6'
      }
    })
  ],
  // Disable esbuild since we're using SWC
  esbuild: false,
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.d.ts']
    }
  }
});
