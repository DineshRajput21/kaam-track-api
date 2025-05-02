module.exports = {
  env: {
    node: true,
    es2021: true,
  },
  parserOptions: {
    ecmaVersion: "latest", // or 2021 or 12
    sourceType: "module",
  },
  extends: ["google"],
  rules: {
    "no-restricted-globals": ["error", "name", "length"],
    "prefer-arrow-callback": "error",
    "quotes": ["error", "double", { "allowTemplateLiterals": true }],
    "object-curly-spacing": ["error", "always"],
    "max-len": ["warn", { code: 120 }],
    "new-cap": "off",
  },
};
