export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

export interface User {
  id: string;
  email: string;
  username?: string;
  avatar?: string;
  gender?: Gender;
  age?: number;
  country?: string;
  interests?: string[];
  isGuest: boolean;
  isPremium: boolean;
  premiumExpiresAt?: string;
  dailyMatchCount?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface AuthResponse extends AuthTokens {
  user: User;
}

export interface Partner {
  id: string;
  username?: string;
  avatar?: string;
  country?: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  senderId: string;
  content: string;
  timestamp: string;
}

export interface QueueStats {
  queueSize: number;
  onlineCount: number;
  estimatedWaitSeconds: number;
}

export interface AppStats {
  onlineCount: number;
  trendingCountries: { country: string; count: number }[];
}

export type ReportReason =
  | 'inappropriate_content'
  | 'harassment'
  | 'spam'
  | 'underage'
  | 'other';

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Auth: undefined;
  Main: undefined;
  Matching: undefined;
  VideoChat: { sessionId: string; partner: Partner };
  Profile: undefined;
  EditProfile: undefined;
  Subscription: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  OtpVerification: { email: string };
};
