import js from "@eslint/js";
import globals from "globals";
import pluginReact from "eslint-plugin-react";
import { defineConfig } from "eslint/config";


export default defineConfig([
  { files: ["**/*.{js,mjs,cjs,jsx}"], plugins: { js }, extends: ["js/recommended"] },
  { files: ["**/*.{js,mjs,cjs,jsx}"], languageOptions: { globals: globals.browser } },
  pluginReact.configs.flat.recommended,
]);
module.exports = {
  env: {
    node:   true,    // <-- enables `process`, `__dirname`, etc.
    es2021: true     // <-- modern JS features
  },
  parserOptions: {
    ecmaVersion: 12, // or “latest”
    sourceType:  "module"
  },
  extends: [
    "eslint:recommended"
  ],
  rules: {
    // any diff rules you like
  }
}
