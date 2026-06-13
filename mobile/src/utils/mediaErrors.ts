export class MediaPermissionError extends Error {
  readonly camera: boolean;
  readonly microphone: boolean;

  constructor(message: string, camera: boolean, microphone: boolean) {
    super(message);
    this.name = 'MediaPermissionError';
    this.camera = camera;
    this.microphone = microphone;
  }
}

export class MediaConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MediaConnectionError';
  }
}

export function classifyMediaError(error: unknown): {
  title: string;
  message: string;
  isPermission: boolean;
} {
  if (error instanceof MediaPermissionError) {
    if (!error.microphone) {
      return {
        title: 'Microphone Required',
        message: 'Please allow microphone access in your phone settings to use video chat.',
        isPermission: true,
      };
    }

    return {
      title: 'Camera Unavailable',
      message: 'Camera access was denied. You can still join with audio only.',
      isPermission: true,
    };
  }

  if (error instanceof MediaConnectionError) {
    return {
      title: 'Connection Failed',
      message: error.message,
      isPermission: false,
    };
  }

  if (error instanceof Error) {
    const lower = error.message.toLowerCase();
    const permissionCodes = ['permissiondeniederror', 'notallowederror', 'securityerror'];

    if (permissionCodes.some((code) => lower.includes(code))) {
      return {
        title: 'Permissions Required',
        message: 'Please allow camera and microphone access in your phone settings, then try again.',
        isPermission: true,
      };
    }

    if (lower.includes('device in use') || lower.includes('notreadableerror')) {
      return {
        title: 'Camera In Use',
        message: 'Your camera or microphone is being used by another app. Close it and try again.',
        isPermission: false,
      };
    }

    return {
      title: 'Connection Failed',
      message: error.message,
      isPermission: false,
    };
  }

  return {
    title: 'Connection Failed',
    message: 'Failed to start video chat. Please try again.',
    isPermission: false,
  };
}
