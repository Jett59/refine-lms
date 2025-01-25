// For a detailed explanation regarding each configuration property, visit:
// https://jestjs.io/docs/en/configuration.html

module.exports = {
  transform: {
    "^.+\\.ts?$": "ts-jest",
  },
  testRegex: "^.+\\.spec\\.ts$",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  collectCoverage: true,
  coveragePathIgnorePatterns: [
    "node_modules",
    // TODO: Maybe it's possible to test this, but for now this is the only solution I can think of
    "google-drive.ts"
  ],
  coverageThreshold: {
    global: {
      "branches": 70,
      "functions": 70,
      "lines": 70,
      "statements": 70
    }
  }
};
