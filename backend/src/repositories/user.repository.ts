import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';

@Injectable()
export class UserRepository {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  async create(data: Partial<User>): Promise<UserDocument> {
    const user = new this.userModel(data);
    return user.save();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async findByGoogleId(googleId: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ googleId }).exec();
  }

  async update(id: string, data: Partial<User>): Promise<UserDocument | null> {
    return this.userModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async blockUser(userId: string, blockedUserId: string): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(userId, { $addToSet: { blockedUsers: new Types.ObjectId(blockedUserId) } }, { new: true })
      .exec();
  }

  async countOnline(): Promise<number> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return this.userModel.countDocuments({ lastSeenAt: { $gte: fiveMinutesAgo } }).exec();
  }

  async getTrendingCountries(): Promise<{ country: string; count: number }[]> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return this.userModel.aggregate([
      { $match: { lastSeenAt: { $gte: fiveMinutesAgo }, country: { $exists: true, $ne: '' } } },
      { $group: { _id: '$country', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { _id: 0, country: '$_id', count: 1 } },
    ]);
  }
}
