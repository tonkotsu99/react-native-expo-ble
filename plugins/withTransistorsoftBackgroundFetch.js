const { withProjectBuildGradle } = require("@expo/config-plugins");

const MAVEN_SNIPPETS = [
  "maven { url(\"${project(':react-native-background-fetch').projectDir}/libs\") }",
  'maven { url "https://maven.transistorsoft.com" }',
];

const ensureMavenRepos = (contents) => {
  let updatedContents = contents;

  const repoBlockRegex =
    /(allprojects\s*\{[^]*?repositories\s*\{)([^]*?)(\n\s*\}\s*\}\s*)/;
  const match = updatedContents.match(repoBlockRegex);

  const ensureSnippetInBlock = (existingBlock, snippet) => {
    if (existingBlock.includes(snippet)) {
      return existingBlock;
    }
    return `\n        ${snippet}${existingBlock}`;
  };

  if (match) {
    const [fullMatch, prefix, middle, suffix] = match;
    let newMiddle = middle;
    MAVEN_SNIPPETS.forEach((snippet) => {
      newMiddle = ensureSnippetInBlock(newMiddle, snippet);
    });
    updatedContents = updatedContents.replace(
      fullMatch,
      `${prefix}${newMiddle}${suffix}`
    );
  } else {
    const snippetsBlock = MAVEN_SNIPPETS.map(
      (snippet) => `        ${snippet}`
    ).join("\n");
    updatedContents = `${updatedContents}\n\nallprojects {\n    repositories {\n${snippetsBlock}\n    }\n}`;
  }

  return updatedContents;
};

module.exports = function withTransistorsoftBackgroundFetch(config) {
  return withProjectBuildGradle(config, (config) => {
    const buildGradle = config.modResults;

    if (buildGradle.language !== "groovy") {
      return config;
    }

    buildGradle.contents = ensureMavenRepos(buildGradle.contents);

    return config;
  });
};
