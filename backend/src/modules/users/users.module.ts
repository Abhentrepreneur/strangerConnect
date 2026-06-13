import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersController, StatsController } from './users.controller';
import { UsersService } from './users.service';
import { User, UserSchema } from '../../schemas/user.schema';
import { UserRepository } from '../../repositories/user.repository';
import { CloudinaryService } from '../../services/cloudinary.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    AuthModule,
  ],
  controllers: [UsersController, StatsController],
  providers: [UsersService, UserRepository, CloudinaryService],
  exports: [UsersService, UserRepository],
})
export class UsersModule {}
