import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
  PREFER_NOT_TO_SAY = 'prefer_not_to_say',
}

export enum AuthProvider {
  EMAIL = 'email',
  GOOGLE = 'google',
  GUEST = 'guest',
}

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  email: string;

  @Prop({ trim: true })
  username?: string;

  @Prop()
  avatar?: string;

  @Prop({ enum: Gender })
  gender?: Gender;

  @Prop({ min: 18, max: 120 })
  age?: number;

  @Prop()
  country?: string;

  @Prop({ type: [String], default: [] })
  interests: string[];

  @Prop({ enum: AuthProvider, default: AuthProvider.EMAIL })
  authProvider: AuthProvider;

  @Prop()
  googleId?: string;

  @Prop({ default: false })
  isGuest: boolean;

  @Prop({ default: false })
  isPremium: boolean;

  @Prop({ type: Date })
  premiumExpiresAt?: Date;

  @Prop({ default: 0 })
  dailyMatchCount: number;

  @Prop({ type: Date })
  lastMatchResetAt?: Date;

  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  blockedUsers: Types.ObjectId[];

  @Prop()
  fcmToken?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Date })
  lastSeenAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ country: 1 });
UserSchema.index({ interests: 1 });
UserSchema.index({ googleId: 1 }, { sparse: true });
