const fs = require('fs');
const path = require('path');
const { withAndroidManifest, withDangerousMod, withMainApplication } = require('@expo/config-plugins');

const PERMISSIONS = [
  'android.permission.RECORD_AUDIO',
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.FOREGROUND_SERVICE_SPECIAL_USE',
];

function addPermission(manifest, permission) {
  const permissions = manifest.manifest['uses-permission'] || [];
  if (!permissions.some((entry) => entry?.$?.['android:name'] === permission)) {
    permissions.push({ $: { 'android:name': permission } });
  }
  manifest.manifest['uses-permission'] = permissions;
}

module.exports = function withSynauraNativeMessaging(config) {
  config = withAndroidManifest(config, (androidConfig) => {
    PERMISSIONS.forEach((permission) => addPermission(androidConfig.modResults, permission));
    const application = androidConfig.modResults.manifest.application?.[0];
    if (application) {
      application.service = application.service || [];
      if (!application.service.some((entry) => entry?.$?.['android:name'] === '.SynauraBubbleService')) {
        application.service.push({
          $: {
            'android:name': '.SynauraBubbleService',
            'android:exported': 'false',
            'android:foregroundServiceType': 'specialUse',
          },
          property: [{
            $: {
              'android:name': 'android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE',
              'android:value': 'Opt-in floating shortcut for Synaura conversations',
            },
          }],
        });
      }
    }
    return androidConfig;
  });

  config = withMainApplication(config, (androidConfig) => {
    const source = androidConfig.modResults.contents;
    if (!source.includes('add(SynauraMessagingPackage())')) {
      androidConfig.modResults.contents = source.replace(
        /PackageList\(this\)\.packages\.apply \{/,
        'PackageList(this).packages.apply {\n              add(SynauraMessagingPackage())',
      );
    }
    return androidConfig;
  });

  return withDangerousMod(config, ['android', async (androidConfig) => {
    const packageName = androidConfig.android?.package || 'com.synaura.music';
    const destination = path.join(
      androidConfig.modRequest.platformProjectRoot,
      'app', 'src', 'main', 'java',
      ...packageName.split('.'),
    );
    const source = path.join(__dirname, 'native-messaging', 'native');
    fs.mkdirSync(destination, { recursive: true });
    for (const file of ['SynauraMessagingModule.kt', 'SynauraMessagingPackage.kt', 'SynauraBubbleService.kt']) {
      fs.copyFileSync(path.join(source, file), path.join(destination, file));
    }
    return androidConfig;
  }]);
};
