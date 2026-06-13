import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RefreshToken, RefreshTokenDocument } from '../schemas/refresh-token.schema';

@Injectable()
export class RefreshTokenRepository {
  constructor(
    @InjectModel(RefreshToken.name) private readonly refreshTokenModel: Model<RefreshTokenDocument>,
  ) {}

  async create(userId: string, token: string, expiresAt: Date): Promise<RefreshTokenDocument> {
    const doc = new this.refreshTokenModel({
      userId: new Types.ObjectId(userId),
      token,
      expiresAt,
    });
    return doc.save();
  }

  async findByToken(token: string): Promise<RefreshTokenDocument | null> {
    return this.refreshTokenModel.findOne({ token, isRevoked: false }).exec();
  }

  async revoke(token: string): Promise<void> {
    await this.refreshTokenModel.updateOne({ token }, { isRevoked: true }).exec();
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.refreshTokenModel.updateMany({ userId: new Types.ObjectId(userId) }, { isRevoked: true }).exec();
  }
}
