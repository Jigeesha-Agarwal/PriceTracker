import globals from "globals";
import js from "@eslint/js";
export default [
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: { ...globals.node, ...globals.commonjs } },
  },
  {
    files: ["**/*.js"],
    languageOptions: { sourceType: "commonjs" },
  },
  {
    rules: {
      "no-unused-vars": "warn",
      "no-console": "off",
      "semi": ["warn", "always"],
      "eqeqeq": ["warn", "always"]
    }
  }
];