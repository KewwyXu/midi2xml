export default {
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": "babel-jest", // 匹配文件并应用 Babel
  },
  // 可选：排除 node_modules（默认已排除，除非需要转译某些 ESM 包）
  transformIgnorePatterns: ["node_modules/(?!lodash-es)"],
  testEnvironment: "jest-environment-node",
  globals: {
    "ts-jest": {
      useESM: true, // 如果使用 TypeScript
    },
  },
  extensionsToTreatAsEsm: [".ts"],
};
