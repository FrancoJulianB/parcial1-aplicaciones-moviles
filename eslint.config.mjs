import parser from "@typescript-eslint/parser";
import stylistic from "@stylistic/eslint-plugin";
import prettier from "eslint-config-prettier";

export default [
  {
    ignores: [
      "node_modules/**",
      ".expo/**",
      "dist/**",
      "coverage/**",
      "package-lock.json",
    ],
  },
  prettier,
  {
    files: ["**/*.{js,mjs,ts,tsx}"],
    languageOptions: {
      parser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      "@stylistic": stylistic,
    },
    rules: {
      "arrow-body-style": ["error", "always"],
      curly: ["error", "all"],
      "one-var": ["error", "never"],
      "@stylistic/brace-style": ["error", "1tbs", { allowSingleLine: false }],
      "@stylistic/curly-newline": ["error", "always"],
      "@stylistic/indent": ["error", 2, { SwitchCase: 1 }],
      "@stylistic/max-statements-per-line": ["error", { max: 1 }],
      "@stylistic/jsx-max-props-per-line": [
        "error",
        { maximum: 1, when: "always" },
      ],
      "@stylistic/padding-line-between-statements": [
        "error",
        {
          blankLine: "always",
          prev: ["const", "let", "block-like"],
          next: "*",
        },
        {
          blankLine: "always",
          prev: "*",
          next: ["const", "let", "export", "try"],
        },
        { blankLine: "any", prev: ["const", "let"], next: ["const", "let"] },
        { blankLine: "always", prev: "*", next: ["function", "return"] },
      ],
    },
  },
];
