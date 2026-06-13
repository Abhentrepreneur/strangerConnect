export const COLORS = {
  background: '#0A0A0A',
  surface: '#141414',
  primary: '#7C3AED',
  secondary: '#EC4899',
  accent: '#06B6D4',
  muted: '#888888',
  border: '#2A2A2A',
  white: '#FFFFFF',
  error: '#EF4444',
  success: '#10B981',
} as const;

export const GRADIENTS = {
  primary: ['#7C3AED', '#EC4899'] as const,
  accent: ['#06B6D4', '#7C3AED'] as const,
  dark: ['#141414', '#0A0A0A'] as const,
};

export const INTERESTS = [
  'Music',
  'Gaming',
  'Sports',
  'Travel',
  'Movies',
  'Art',
  'Technology',
  'Food',
  'Fitness',
  'Books',
  'Photography',
  'Fashion',
] as const;

export const COUNTRIES = [
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'Germany',
  'France',
  'India',
  'Brazil',
  'Japan',
  'South Korea',
  'Mexico',
  'Spain',
] as const;

export const ONBOARDING_SLIDES = [
  {
    title: 'Meet Strangers Worldwide',
    description: 'Connect with people from every corner of the globe through HD video chat.',
    icon: '🌍',
  },
  {
    title: 'Safe & Secure',
    description: 'Report, block, and stay protected with our advanced safety features.',
    icon: '🛡️',
  },
  {
    title: 'Premium Experience',
    description: 'Filter by country, gender, and get priority matching with Premium.',
    icon: '✨',
  },
] as const;

/** STUN + public TURN — required for video/audio across different networks/NATs */
export const ICE_SERVERS: Array<{
  urls: string | string[];
  username?: string;
  credential?: string;
}> = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  {
    urls: [
      'turn:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:443',
      'turn:openrelay.metered.ca:443?transport=tcp',
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];
