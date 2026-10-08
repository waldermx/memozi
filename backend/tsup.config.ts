import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/main.ts'],
  format: ['esm'],
  dts: false,
  sourcemap: true,
  outDir: 'dist',
  // Bundle @memozi/shared inline so the compiled dist/main.js is fully
  // self-contained — no runtime dependency on the workspace TypeScript source.
  noExternal: ['@memozi/shared'],
});
