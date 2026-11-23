const { withGradleProperties } = require("expo/config-plugins");

const PHONE_ABIS = "armeabi-v7a,arm64-v8a";

module.exports = function withAndroidPhoneArchitectures(config) {
  return withGradleProperties(config, (config) => {
    const architectureProperty = config.modResults.find(
      (property) =>
        property.type === "property" &&
        property.key === "reactNativeArchitectures",
    );

    if (architectureProperty) {
      architectureProperty.value = PHONE_ABIS;
    } else {
      config.modResults.push({
        type: "property",
        key: "reactNativeArchitectures",
        value: PHONE_ABIS,
      });
    }

    return config;
  });
};
