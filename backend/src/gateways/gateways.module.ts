import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { MatchingModule } from '../modules/matching/matching.module';
import { ReportsModule } from '../modules/reports/reports.module';
import { AuthModule } from '../modules/auth/auth.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatMessage, ChatMessageSchema } from '../schemas/chat-message.schema';
import { ChatMessageRepository } from '../repositories/chat-message.repository';
import { User, UserSchema } from '../schemas/user.schema';
import { UserRepository } from '../repositories/user.repository';

@Module({
  imports: [
    MatchingModule,
    ReportsModule,
    AuthModule,
    MongooseModule.forFeature([
      { name: ChatMessage.name, schema: ChatMessageSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  providers: [ChatGateway, ChatMessageRepository, UserRepository],
})
export class GatewaysModule {}
