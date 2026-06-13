import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MatchingService } from './matching.service';
import { User, UserSchema } from '../../schemas/user.schema';
import { UserRepository } from '../../repositories/user.repository';
import { RedisService } from '../../services/redis.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    AuthModule,
  ],
  providers: [MatchingService, UserRepository, RedisService],
  exports: [MatchingService, RedisService],
})
export class MatchingModule {}
