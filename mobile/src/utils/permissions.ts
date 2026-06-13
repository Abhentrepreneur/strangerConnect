import { Platform, PermissionsAndroid } from 'react-native';
import { permissions as webrtcPermissions } from 'react-native-webrtc';

export interface MediaPermissionResult {
  camera: boolean;
  microphone: boolean;
}

export async function requestMediaPermissions(): Promise<MediaPermissionResult> {
  if (Platform.OS === 'android') {
    const camera = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
    const audio = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);

    return {
      camera: camera === PermissionsAndroid.RESULTS.GRANTED,
      microphone: audio === PermissionsAndroid.RESULTS.GRANTED,
    };
  }

  let camera = false;
  let microphone = false;

  try {
    const cameraResult = await webrtcPermissions.request({ name: 'camera' });
    camera = isPermissionGranted(cameraResult);
  } catch {
    camera = false;
  }

  try {
    const micResult = await webrtcPermissions.request({ name: 'microphone' });
    microphone = isPermissionGranted(micResult);
  } catch {
    microphone = false;
  }

  return { camera, microphone };
}

function isPermissionGranted(result: unknown): boolean {
  return result === 'granted' || result === true;
}

export function hasRequiredMediaPermissions(result: MediaPermissionResult): boolean {
  return result.microphone;
}
