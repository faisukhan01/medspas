const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

// ── Single react-native-css-interop instance (blank-screen fix) ──────────────
// nativewind@4.2.7 carries a nested copy of react-native-css-interop. Without
// this resolver Metro bundles BOTH copies: the JSX runtime (nativewind/jsx-runtime)
// resolves to the nested one, while the generated CSS registration modules
// resolve to the root one. Two module instances = two style registries →
// className styles never bind and the release app boots to a blank screen.
// Every `react-native-css-interop` import is forced to the ROOT copy.
const config = withNativeWind(getDefaultConfig(__dirname), { input: "./global.css" });

const CSS_INTEROP_PREFIX = "react-native-css-interop";
// Resolve from the project root's package.json → always lands on the root copy.
const PROJECT_ORIGIN = path.join(__dirname, "package.json");

const baseResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === CSS_INTEROP_PREFIX || moduleName.startsWith(`${CSS_INTEROP_PREFIX}/`)) {
    return context.resolveRequest(
      { ...context, originPath: PROJECT_ORIGIN },
      moduleName,
      platform
    );
  }
  if (baseResolveRequest) return baseResolveRequest(context, moduleName, platform);
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
