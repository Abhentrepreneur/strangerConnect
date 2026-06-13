declare module 'react-native-incall-manager' {
  const InCallManager: {
    start: (options: { media: 'audio' | 'video' }) => void;
    stop: () => void;
    setForceSpeakerphoneOn: (enabled: boolean) => void;
    setKeepScreenOn: (enabled: boolean) => void;
  };

  export default InCallManager;
}
