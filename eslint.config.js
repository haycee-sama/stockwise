import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // Allow capitalized identifiers (e.g. `Icon`, `Image`) and
      // underscore-prefixed names to go unused. This mirrors the
      // React convention where a component is destructured from
      // props as `icon: Icon` and then rendered as `<Icon />`. The
      // pattern applies to both top-level variables and function
      // arguments / destructured props.
      'no-unused-vars': ['error', {
        varsIgnorePattern: '^[A-Z_]',
        argsIgnorePattern: '^[A-Z_]',
        caughtErrorsIgnorePattern: '^[A-Z_]',
      }],
    },
  },
  {
    // Test files legitimately use Node APIs (node:fs, node:url,
    // node:path) for filesystem checks + the test runner's
    // assertions API (describe/it/expect come from Vitest's
    // globals=true). Give them Node + Vitest globals in addition
    // to the browser globals inherited from the block above.
    files: ['**/*.test.{js,jsx}', 'src/test/**/*.{js,jsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly',
      },
    },
  },
])
