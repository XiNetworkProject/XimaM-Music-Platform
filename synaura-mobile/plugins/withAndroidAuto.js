const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

function addAndroidAutoToManifest(config) {
  return withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults;
    const app = manifest.manifest.application?.[0];
    if (!app) return mod;

    // Add MEDIA_BUTTON intent filter to main activity
    const mainActivity = app.activity?.find(
      (a) => a.$?.['android:name'] === '.MainActivity'
    );
    if (mainActivity) {
      if (!mainActivity['intent-filter']) mainActivity['intent-filter'] = [];
      const hasMediaButton = mainActivity['intent-filter'].some((f) =>
        f.action?.some((a) => a.$?.['android:name'] === 'android.intent.action.MEDIA_BUTTON')
      );
      if (!hasMediaButton) {
        mainActivity['intent-filter'].push({
          action: [{ $: { 'android:name': 'android.intent.action.MEDIA_BUTTON' } }],
        });
      }
    }

    // Add MediaBrowserService
    if (!app.service) app.service = [];
    const hasMediaService = app.service.some(
      (s) => s.$?.['android:name'] === 'com.doublesymmetry.trackplayer.service.MusicService'
    );
    if (!hasMediaService) {
      app.service.push({
        $: {
          'android:name': 'com.doublesymmetry.trackplayer.service.MusicService',
          'android:exported': 'true',
        },
        'intent-filter': [
          {
            action: [
              { $: { 'android:name': 'android.media.browse.MediaBrowserService' } },
            ],
          },
        ],
      });
    }

    // Add meta-data for Android Auto
    if (!app['meta-data']) app['meta-data'] = [];
    const hasAutoMeta = app['meta-data'].some(
      (m) => m.$?.['android:name'] === 'com.google.android.gms.car.application'
    );
    if (!hasAutoMeta) {
      app['meta-data'].push({
        $: {
          'android:name': 'com.google.android.gms.car.application',
          'android:resource': '@xml/automotive_app_desc',
        },
      });
    }

    return mod;
  });
}

function addAutomotiveAppDesc(config) {
  return withDangerousMod(config, [
    'android',
    async (mod) => {
      const xmlDir = path.join(mod.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res', 'xml');
      if (!fs.existsSync(xmlDir)) {
        fs.mkdirSync(xmlDir, { recursive: true });
      }
      const xmlPath = path.join(xmlDir, 'automotive_app_desc.xml');
      const content = `<?xml version="1.0" encoding="utf-8"?>
<automotiveApp>
    <uses name="media" />
</automotiveApp>
`;
      fs.writeFileSync(xmlPath, content, 'utf-8');
      return mod;
    },
  ]);
}

module.exports = function withAndroidAuto(config) {
  config = addAndroidAutoToManifest(config);
  config = addAutomotiveAppDesc(config);
  return config;
};
