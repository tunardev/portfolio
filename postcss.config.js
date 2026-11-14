const babelConfig = require("./babel.config");

module.exports = {
  plugins: {
    "@stylexjs/postcss-plugin": {
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}"],
      babelConfig: {
        babelrc: false,
        parserOpts: { plugins: ["typescript", "jsx"] },
        plugins: babelConfig.plugins,
      },
      useCSSLayers: { before: ["reset"], prefix: "stylex" },
    },
    autoprefixer: {},
  },
};
