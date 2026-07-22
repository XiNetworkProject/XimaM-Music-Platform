const fs = require('fs');
const path = require('path');
const { withAndroidManifest, withDangerousMod, withMainApplication } = require('@expo/config-plugins');

const PERMISSIONS = [
  'android.permission.RECORD_AUDIO',
];
const REMOVED_PERMISSIONS = new Set([
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.FOREGROUND_SERVICE_SPECIAL_USE',
]);

function addPermission(manifest, permission) {
  const permissions = manifest.manifest['uses-permission'] || [];
  if (!permissions.some((entry) => entry?.$?.['android:name'] === permission)) {
    permissions.push({ $: { 'android:name': permission } });
  }
  manifest.manifest['uses-permission'] = permissions;
}

module.exports = function withSynauraNativeMessaging(config) {
  config = withAndroidManifest(config, (androidConfig) => {
    androidConfig.modResults.manifest['uses-permission'] = (androidConfig.modResults.manifest['uses-permission'] || [])
      .filter((entry) => !REMOVED_PERMISSIONS.has(entry?.$?.['android:name']));
    PERMISSIONS.forEach((permission) => addPermission(androidConfig.modResults, permission));
    const application = androidConfig.modResults.manifest.application?.[0];
    if (application) {
      application.service = (application.service || []).filter((entry) => entry?.$?.['android:name'] !== '.SynauraBubbleService');
      application.activity = application.activity || [];
      if (!application.activity.some((entry) => entry?.$?.['android:name'] === '.SynauraBubbleActivity')) {
        application.activity.push({
          $: {
            'android:name': '.SynauraBubbleActivity',
            'android:exported': 'false',
            'android:allowEmbedded': 'true',
            'android:resizeableActivity': 'true',
            'android:documentLaunchMode': 'always',
            'android:windowSoftInputMode': 'adjustResize',
            'android:theme': '@style/AppTheme',
          },
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
    const staleService = path.join(destination, 'SynauraBubbleService.kt');
    if (fs.existsSync(staleService)) fs.unlinkSync(staleService);
    for (const file of ['SynauraMessagingModule.kt', 'SynauraMessagingPackage.kt', 'SynauraBubbleManager.kt', 'SynauraBubbleActivity.kt']) {
      fs.copyFileSync(path.join(source, file), path.join(destination, file));
    }
    return androidConfig;
  }]);
};
