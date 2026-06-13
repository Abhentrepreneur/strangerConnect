import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChatMessage, ChatMessageDocument } from '../schemas/chat-message.schema';

@Injectable()
export class ChatMessageRepository {
  constructor(
    @InjectModel(ChatMessage.name) private readonly messageModel: Model<ChatMessageDocument>,
  ) {}

  async create(data: Partial<ChatMessage>): Promise<ChatMessageDocument> {
    const message = new this.messageModel(data);
    return message.save();
  }

  async findBySession(sessionId: string, limit = 50): Promise<ChatMessageDocument[]> {
    return this.messageModel
      .find({ sessionId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }
}
