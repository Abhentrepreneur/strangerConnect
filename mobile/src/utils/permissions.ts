import { Platform, PermissionsAndroid } from 'react-native';
import { permissions as webrtcPermissions } from 'react-native-webrtc';

export async function requestMediaPermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    const camera = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
    );
    const audio = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    );

    return (
      camera === PermissionsAndroid.RESULTS.GRANTED &&
      audio === PermissionsAndroid.RESULTS.GRANTED
    );
  }

  try {
    await webrtcPermissions.request({ name: 'camera' });
    await webrtcPermissions.request({ name: 'microphone' });
    return true;
  } catch {
    return false;
  }
}
