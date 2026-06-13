import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { BlockUserDto, UpdateProfileDto } from './dto/user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getProfile(@CurrentUser('sub') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Patch('me')
  updateProfile(@CurrentUser('sub') userId: string, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Post('block')
  blockUser(@CurrentUser('sub') userId: string, @Body() dto: BlockUserDto) {
    return this.usersService.blockUser(userId, dto.userId);
  }

  @Post('fcm-token')
  updateFcmToken(
    @CurrentUser('sub') userId: string,
    @Body('fcmToken') fcmToken: string,
  ) {
    return this.usersService.updateFcmToken(userId, fcmToken);
  }
}

@Controller('stats')
export class StatsController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getStats() {
    return this.usersService.getStats();
  }
}
