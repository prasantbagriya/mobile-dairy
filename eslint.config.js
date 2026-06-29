const reactHooks = require("eslint-plugin-react-hooks");
const tsParser = require("@typescript-eslint/parser");

module.exports = [
  {
    files: ["src/**/*.tsx", "src/**/*.ts"],
    plugins: {
      "react-hooks": reactHooks,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
    },
  },
];
