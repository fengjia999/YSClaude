require('react-native-gesture-handler');

const { applyGlobalDefaultFont } = require('./src/theme/globalDefaultFont');

applyGlobalDefaultFont();

require('expo-router/entry');
