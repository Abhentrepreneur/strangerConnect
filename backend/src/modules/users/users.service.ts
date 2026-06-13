import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from '../../repositories/user.repository';
import { CloudinaryService } from '../../services/cloudinary.service';
import { UpdateProfileDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    return {
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      avatar: user.avatar,
      gender: user.gender,
      age: user.age,
      country: user.country,
      interests: user.interests,
      isGuest: user.isGuest,
      isPremium: user.isPremium,
      premiumExpiresAt: user.premiumExpiresAt,
      dailyMatchCount: user.dailyMatchCount,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    let avatar = dto.avatar;
    if (dto.avatar?.startsWith('data:image')) {
      avatar = await this.cloudinaryService.uploadImage(dto.avatar);
    }

    const user = await this.userRepository.update(userId, { ...dto, avatar });
    if (!user) throw new NotFoundException('User not found');

    return this.getProfile(userId);
  }

  async blockUser(userId: string, blockedUserId: string) {
    await this.userRepository.blockUser(userId, blockedUserId);
    return { message: 'User blocked successfully' };
  }

  async updateFcmToken(userId: string, fcmToken: string) {
    await this.userRepository.update(userId, { fcmToken });
    return { message: 'FCM token updated' };
  }

  async getStats() {
    const [onlineCount, trendingCountries] = await Promise.all([
      this.userRepository.countOnline(),
      this.userRepository.getTrendingCountries(),
    ]);

    return { onlineCount, trendingCountries };
  }
}
