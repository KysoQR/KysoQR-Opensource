import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['.next/**', '.open-next/**', '.wrangler/**', 'node_modules/**', 'coverage/**'] },
  ...nextCoreWebVitals,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Convention used throughout for intentionally-unimplemented/unused
      // params (stubs, route handler signatures Next.js requires).
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  }
);
