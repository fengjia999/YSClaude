const fs = require('fs');
const path = require('path');

const baseConfig = require('./app.json');

const localFontEntries = [
  { key: 'regular', path: './assets/Sohne-Buch.otf' },
  { key: 'bold', path: './assets/Sohne-Halbfett.otf' },
  { key: 'mono', path: './assets/SohneMono-Buch.otf' },
  { key: 'serif', path: './assets/TiemposText.otf' },
  { key: 'serifBold', path: './assets/TiemposText-bold.otf' },
  { key: 'serifStrong', path: './assets/TiemposText-bold2.otf' },
  { key: 'sourceHanSans', path: './assets/SourceHanSansSC.otf' },
];

function hasFile(relativePath) {
  return fs.existsSync(path.join(__dirname, relativePath));
}

function withOptionalLocalFonts(config) {
  const availableFontEntries = localFontEntries.filter((entry) => hasFile(entry.path));
  const availableFonts = availableFontEntries.map((entry) => entry.path);
  const localFonts = Object.fromEntries(
    localFontEntries.map((entry) => [entry.key, availableFontEntries.includes(entry)])
  );

  const expo = config.expo ?? {};
  const plugins = [...(expo.plugins ?? [])];

  if (availableFonts.length > 0) {
    plugins.push([
      'expo-font',
      {
        fonts: availableFonts,
      },
    ]);
  }

  return {
    ...config,
    expo: {
      ...expo,
      plugins,
      extra: {
        ...(expo.extra ?? {}),
        localFonts,
      },
    },
  };
}

module.exports = withOptionalLocalFonts(baseConfig);
