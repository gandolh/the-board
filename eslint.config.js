import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

/**
 * Thin on purpose: the compiler (`strict`, `noUnusedLocals`,
 * `noUncheckedIndexedAccess`) is the main gate, and this adds what it cannot
 * see. The React hooks rules apply to the board only.
 */
export default tseslint.config(
  { ignores: ["**/dist/**", "**/node_modules/**", "data/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["web/src/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
);
