import next from "eslint-config-next";
import unusedImports from "eslint-plugin-unused-imports";

/** @type {import("eslint").Linter.FlatConfig[]} */
export default [
  ...next,

  {
    plugins: {
      "unused-imports": unusedImports,
    },

    rules: {
      // 🔥 remove unused imports
      "unused-imports/no-unused-imports": "error",

      // warn unused vars
      "unused-imports/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],

      // import order
      "import/order": [
        "warn",
        {
          groups: ["builtin", "external", "internal"],
          "newlines-between": "always",
          alphabetize: {
            order: "asc",
            caseInsensitive: true,
          },
        },
      ],
    },
  },
];
