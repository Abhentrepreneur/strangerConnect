/** @type {import('expo/config').ExpoConfig} */
const app = require('./app.json');

/** Baked into the native app — release APKs read this via expo-constants. */
const PRODUCTION_API_URL =
  'https://strangerconnect-production.up.railway.app/api/v1';
const PRODUCTION_SOCKET_URL =
  'https://strangerconnect-production.up.railway.app';

module.exports = {
  expo: {
    ...app.expo,
    extra: {
      ...app.expo.extra,
      apiUrl: PRODUCTION_API_URL,
      socketUrl: PRODUCTION_SOCKET_URL,
    },
  },
};
