const { GenerateSW } = require('workbox-webpack-plugin');
const path = require('path');

module.exports = {
  webpack: {
    // alias: {
    //   "@utils": path.resolve(__dirname, "src/utils"),
    //   "@components": path.resolve(__dirname, "src/components"),
    //   "@hooks": path.resolve(__dirname, "src/hooks"),
    //   "@constants": path.resolve(__dirname, "src/constants")
    // },
    configure: (webpackConfig) => {
      // Nur im Production-Build das Plugin hinzufügen
      if (process.env.NODE_ENV === 'production') {
        webpackConfig.plugins.push(
          new GenerateSW({
            clientsClaim: true, // Wichtig: Damit der neue SW die Kontrolle übernimmt
            skipWaiting: true,  // Wichtig: Aktiviert den neuen SW sofort (oder nach Nachricht)
            maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
            include: [/\.html$/, /\.js$/, /\.css$/, /\.png$/, /\.jpg$/, /\.svg$/],
            // Stelle sicher, dass der generierte SW auf die Nachricht hört
            // Workbox v6+ macht dies standardmäßig, wenn skipWaiting: true gesetzt ist.
          })
        );
      }
      return webpackConfig;
    }
  }
};