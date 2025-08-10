module.exports = {
  env: { es2020: true, node: true },
  parser: '@typescript-eslint/parser',
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  parserOptions: { sourceType: 'module', ecmaVersion: 2020 },
  ignorePatterns: ['dist'],
  rules: {},
};
