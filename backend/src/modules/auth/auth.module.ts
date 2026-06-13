import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { User, UserSchema } from '../../schemas/user.schema';
import { Otp, OtpSchema } from '../../schemas/otp.schema';
import { RefreshToken, RefreshTokenSchema } from '../../schemas/refresh-token.schema';
import { UserRepository } from '../../repositories/user.repository';
import { OtpRepository } from '../../repositories/otp.repository';
import { RefreshTokenRepository } from '../../repositories/refresh-token.repository';
import { EmailService } from '../../services/email.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret') || 'dev-secret',
        signOptions: { expiresIn: '15m' as const },
      }),
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Otp.name, schema: OtpSchema },
      { name: RefreshToken.name, schema: RefreshTokenSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    UserRepository,
    OtpRepository,
    RefreshTokenRepository,
    EmailService,
  ],
  exports: [AuthService, JwtModule, UserRepository],
})
export class AuthModule {}
