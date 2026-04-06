const {
  withProjectBuildGradle,
  createRunOncePlugin,
} = require("@expo/config-plugins");

const OKHTTP_VERSION = "4.12.0";

function addResolutionStrategy(buildGradle) {
  if (buildGradle.includes("withPinnedOkHttp")) return buildGradle;

  const markerStart = "// withPinnedOkHttp:start";
  const markerEnd = "// withPinnedOkHttp:end";

  const snippet = `\n${markerStart}\nallprojects {\n  configurations.all {\n    resolutionStrategy {\n      force \"com.squareup.okhttp3:okhttp:${OKHTTP_VERSION}\"\n      force \"com.squareup.okhttp3:okhttp-urlconnection:${OKHTTP_VERSION}\"\n    }\n  }\n}\n${markerEnd}\n`;

  // Prefer appending at the end of the file to avoid breaking existing blocks.
  return `${buildGradle.trimEnd()}${snippet}`;
}

function withPinnedOkHttp(config) {
  return withProjectBuildGradle(config, (config) => {
    config.modResults.contents = addResolutionStrategy(
      config.modResults.contents
    );
    return config;
  });
}

module.exports = createRunOncePlugin(withPinnedOkHttp, "withPinnedOkHttp", "1.0.0");
