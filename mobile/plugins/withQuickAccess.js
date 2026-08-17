// withQuickAccess.js — top-level Phase 7 plugin, referenced from
// app.json's "plugins" array. Combines the iOS and Android halves so
// app.json only has to name one thing.
const withAndroidQuickAccess = require('./withAndroidQuickAccess');
const withIosAppIntents = require('./withIosAppIntents');

function withQuickAccess(config) {
  config = withAndroidQuickAccess(config);
  config = withIosAppIntents(config);
  return config;
}

module.exports = withQuickAccess;
