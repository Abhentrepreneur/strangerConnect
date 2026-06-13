import { Platform } from 'react-native';
import InCallManager from 'react-native-incall-manager';

let active = false;

export function startCallAudio(): void {
  if (active) return;

  InCallManager.start({ media: 'video' });
  InCallManager.setForceSpeakerphoneOn(true);

  if (Platform.OS === 'android') {
    InCallManager.setKeepScreenOn(true);
  }

  active = true;
}

export function stopCallAudio(): void {
  if (!active) return;

  InCallManager.setForceSpeakerphoneOn(false);
  InCallManager.stop();

  if (Platform.OS === 'android') {
    InCallManager.setKeepScreenOn(false);
  }

  active = false;
}
