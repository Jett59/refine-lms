// For a detailed explanation regarding each configuration property, visit:
// https://jestjs.io/docs/en/configuration.html

module.exports = {
  transform: {
    "^.+\\.ts?$": "ts-jest",
  },
  testRegex: "^.+\\.spec\\.ts$",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  collectCoverage: true,
  coverageThreshold: {
    global: {
      "branches": 70,
      "functions": 70,
      "lines": 70,
      "statements": 70
    }
  }
};
