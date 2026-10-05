const fs = require('fs');
const path = require('path');
const { withDangerousMod, withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withSynauraCallSounds(config) {
  config = withAndroidManifest(config, result => {
    const manifest = result.modResults.manifest;
    manifest['uses-permission'] ||= [];
    for (const name of ['android.permission.MODIFY_AUDIO_SETTINGS', 'android.permission.BLUETOOTH_CONNECT', 'android.permission.FOREGROUND_SERVICE_MICROPHONE']) {
      if (!manifest['uses-permission'].some(item => item.$?.['android:name'] === name)) manifest['uses-permission'].push({ $: { 'android:name': name } });
    }
    const application = manifest.application?.[0];
    if (application) {
      application.service ||= [];
      if (!application.service.some(item => item.$?.['android:name'] === '.SynauraVoiceService')) application.service.push({ $: { 'android:name': '.SynauraVoiceService', 'android:exported': 'false', 'android:foregroundServiceType': 'microphone' } });
    }
    return result;
  });
  return withDangerousMod(config, ['android', async result => {
    const root = result.modRequest.projectRoot;
    const target = path.join(result.modRequest.platformProjectRoot, 'app/src/main/res/raw');
    fs.mkdirSync(target, { recursive: true });
    for (const name of ['incoming', 'outgoing', 'connected', 'missed', 'unavailable', 'ended']) {
      fs.copyFileSync(path.join(root, 'src/assets/calls', name + '.mp3'), path.join(target, 'synaura_call_' + name + '.mp3'));
    }
    return result;
  }]);
};
