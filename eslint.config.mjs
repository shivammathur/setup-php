import {createRequire} from 'node:module';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import jest from 'eslint-plugin-jest';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import js from '@eslint/js';

// Until import-x supports minimatch 11, use its CommonJS entry point to avoid
// the removed makeRe import in no-internal-modules, unused by these presets.
// https://github.com/un-ts/eslint-plugin-import-x/pull/570
const {importX} = createRequire(import.meta.url)('eslint-plugin-import-x');

export default [
  js.configs.recommended,
  ...typescriptEslint.configs['flat/recommended'],
  importX.flatConfigs.errors,
  importX.flatConfigs.warnings,
  importX.flatConfigs.typescript,
  prettierRecommended,
  eslintConfigPrettier,
  {
    plugins: {
      jest
    },

    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest
      },

      parser: tsParser,
      ecmaVersion: 2021,
      sourceType: 'module'
    },

    settings: {
      'import-x/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json'
        },
        node: {
          extensions: ['.js', '.ts']
        }
      },
      'import-x/parsers': {
        '@typescript-eslint/parser': ['.ts']
      }
    }
  }
];
