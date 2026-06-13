import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { UserRepository } from '../../repositories/user.repository';
import { OtpRepository } from '../../repositories/otp.repository';
import { RefreshTokenRepository } from '../../repositories/refresh-token.repository';
import { EmailService } from '../../services/email.service';
import { AuthProvider } from '../../schemas/user.schema';
import { GoogleLoginDto, GuestLoginDto, RefreshTokenDto, VerifyOtpDto } from './dto/auth.dto';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface AuthResponse extends AuthTokens {
  user: {
    id: string;
    email: string;
    username?: string;
    avatar?: string;
    isGuest: boolean;
    isPremium: boolean;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly otpRepository: OtpRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly emailService: EmailService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async sendOtp(email: string): Promise<{ message: string }> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.otpRepository.upsert(email, code, expiresAt);
    await this.emailService.sendOtp(email, code);

    return { message: 'OTP sent successfully' };
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<AuthResponse> {
    const otp = await this.otpRepository.findByEmail(dto.email);

    if (!otp || otp.expiresAt < new Date()) {
      throw new BadRequestException('OTP expired or not found');
    }

    if (otp.attempts >= 5) {
      throw new BadRequestException('Too many attempts. Request a new OTP.');
    }

    if (otp.code !== dto.code) {
      await this.otpRepository.incrementAttempts(dto.email);
      throw new BadRequestException('Invalid OTP');
    }

    await this.otpRepository.delete(dto.email);

    let user = await this.userRepository.findByEmail(dto.email);
    if (!user) {
      user = await this.userRepository.create({
        email: dto.email,
        authProvider: AuthProvider.EMAIL,
        username: dto.email.split('@')[0],
      });
    }

    return this.generateAuthResponse(user._id.toString(), user.email, user.username, user.avatar, user.isGuest, user.isPremium);
  }

  async googleLogin(dto: GoogleLoginDto): Promise<AuthResponse> {
    const googleUser = await this.verifyGoogleToken(dto.idToken);

    let user = await this.userRepository.findByGoogleId(googleUser.sub);
    if (!user) {
      user = await this.userRepository.findByEmail(googleUser.email);
      if (user) {
        user = await this.userRepository.update(user._id.toString(), {
          googleId: googleUser.sub,
          authProvider: AuthProvider.GOOGLE,
        });
      } else {
        user = await this.userRepository.create({
          email: googleUser.email,
          username: googleUser.name,
          avatar: googleUser.picture,
          googleId: googleUser.sub,
          authProvider: AuthProvider.GOOGLE,
        });
      }
    }

    if (!user) throw new UnauthorizedException('Failed to authenticate');

    return this.generateAuthResponse(user._id.toString(), user.email, user.username, user.avatar, user.isGuest, user.isPremium);
  }

  async guestLogin(dto: GuestLoginDto): Promise<AuthResponse> {
    const guestEmail = `guest_${uuidv4()}@guest.strangerconnect.app`;
    const user = await this.userRepository.create({
      email: guestEmail,
      username: dto.username || `Guest_${Date.now().toString(36)}`,
      authProvider: AuthProvider.GUEST,
      isGuest: true,
    });

    return this.generateAuthResponse(user._id.toString(), user.email, user.username, user.avatar, true, false);
  }

  async refreshTokens(dto: RefreshTokenDto): Promise<AuthTokens> {
    const stored = await this.refreshTokenRepository.findByToken(dto.refreshToken);
    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.userRepository.findById(stored.userId.toString());
    if (!user) throw new UnauthorizedException('User not found');

    await this.refreshTokenRepository.revoke(dto.refreshToken);

    const tokens = await this.createTokens(user._id.toString(), user.email, user.isGuest);
    return tokens;
  }

  async logout(refreshToken: string): Promise<void> {
    await this.refreshTokenRepository.revoke(refreshToken);
  }

  private async generateAuthResponse(
    userId: string,
    email: string,
    username?: string,
    avatar?: string,
    isGuest = false,
    isPremium = false,
  ): Promise<AuthResponse> {
    const tokens = await this.createTokens(userId, email, isGuest);
    return {
      ...tokens,
      user: { id: userId, email, username, avatar, isGuest, isPremium },
    };
  }

  private async createTokens(userId: string, email: string, isGuest: boolean): Promise<AuthTokens> {
    const payload = { sub: userId, email, isGuest };
    const expiresIn = this.configService.get<string>('jwt.expiresIn') || '15m';

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.secret'),
      expiresIn: expiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
    });

    const refreshToken = uuidv4();
    const refreshExpires = this.configService.get<string>('jwt.refreshExpiresIn') || '7d';
    const refreshMs = this.parseExpiry(refreshExpires);

    await this.refreshTokenRepository.create(userId, refreshToken, new Date(Date.now() + refreshMs));

    return { accessToken, refreshToken, expiresIn };
  }

  private parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000;
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    return value * (multipliers[unit] || 86400000);
  }

  private async verifyGoogleToken(idToken: string): Promise<{
    sub: string;
    email: string;
    name: string;
    picture?: string;
  }> {
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
    if (!response.ok) throw new UnauthorizedException('Invalid Google token');

    const data = (await response.json()) as {
      sub: string;
      email: string;
      name?: string;
      picture?: string;
      aud: string;
    };

    const clientId = this.configService.get<string>('google.clientId');
    if (clientId && data.aud !== clientId) {
      throw new UnauthorizedException('Invalid Google token audience');
    }

    return {
      sub: data.sub,
      email: data.email,
      name: data.name || data.email.split('@')[0],
      picture: data.picture,
    };
  }
}
