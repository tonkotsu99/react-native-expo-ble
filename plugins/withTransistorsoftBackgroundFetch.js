const { withProjectBuildGradle } = require("@expo/config-plugins");

const MAVEN_SNIPPET = 'maven { url "https://maven.transistorsoft.com" }';

module.exports = function withTransistorsoftBackgroundFetch(config) {
  return withProjectBuildGradle(config, (config) => {
    const buildGradle = config.modResults;

    if (buildGradle.language !== "groovy") {
      return config;
    }

    if (buildGradle.contents.includes(MAVEN_SNIPPET)) {
      return config;
    }

    buildGradle.contents = buildGradle.contents.replace(
      /allprojects\s*\{\s*repositories\s*\{/,
      (match) => `${match}\n        ${MAVEN_SNIPPET}`
    );

    return config;
  });
};
