import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Otp, OtpDocument } from '../schemas/otp.schema';

@Injectable()
export class OtpRepository {
  constructor(@InjectModel(Otp.name) private readonly otpModel: Model<OtpDocument>) {}

  async upsert(email: string, code: string, expiresAt: Date): Promise<OtpDocument> {
    return this.otpModel
      .findOneAndUpdate(
        { email: email.toLowerCase() },
        { code, expiresAt, attempts: 0 },
        { upsert: true, new: true },
      )
      .exec() as Promise<OtpDocument>;
  }

  async findByEmail(email: string): Promise<OtpDocument | null> {
    return this.otpModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async incrementAttempts(email: string): Promise<void> {
    await this.otpModel.updateOne({ email: email.toLowerCase() }, { $inc: { attempts: 1 } }).exec();
  }

  async delete(email: string): Promise<void> {
    await this.otpModel.deleteOne({ email: email.toLowerCase() }).exec();
  }
}
