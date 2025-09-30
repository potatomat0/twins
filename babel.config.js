module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./"],
          alias: {
            "@components": "./components",
            "@context": "./context",
            "@navigation": "./navigation",
            "@themes": "./themes",
            "@services": "./services",
            "@hooks": "./hooks",
            "@data": "./data",
            "@i18n": "./i18n"
          }
        }
      ],
      "react-native-reanimated/plugin"
    ]
  };
};
