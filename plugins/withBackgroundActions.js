const {
  withAndroidManifest,
  withMainActivity,
} = require("@expo/config-plugins");

/**
 * Expo config plugin for react-native-background-actions
 * Adds necessary Android manifest configurations for foreground service
 */

const withBackgroundActionsAndroidManifest = (config) => {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const mainApplication = androidManifest.manifest.application?.[0];

    if (!mainApplication) {
      console.warn(
        "[withBackgroundActions] No application element found in AndroidManifest.xml"
      );
      return config;
    }

    // Ensure service array exists
    if (!mainApplication.service) {
      mainApplication.service = [];
    }

    // Check if BackgroundActionsService already exists
    const serviceExists = mainApplication.service.some(
      (service) =>
        service.$?.["android:name"] ===
        "com.asterinet.react.bgactions.RNBackgroundActionsTask"
    );

    if (!serviceExists) {
      // Add the background service with foregroundServiceType
      mainApplication.service.push({
        $: {
          "android:name":
            "com.asterinet.react.bgactions.RNBackgroundActionsTask",
          "android:foregroundServiceType": "connectedDevice|location",
        },
      });
    } else {
      // Update existing service to ensure foregroundServiceType is set
      const existingService = mainApplication.service.find(
        (service) =>
          service.$?.["android:name"] ===
          "com.asterinet.react.bgactions.RNBackgroundActionsTask"
      );
      if (existingService) {
        existingService.$["android:foregroundServiceType"] =
          "connectedDevice|location";
      }
    }

    return config;
  });
};

module.exports = function withBackgroundActions(config) {
  config = withBackgroundActionsAndroidManifest(config);
  return config;
};
