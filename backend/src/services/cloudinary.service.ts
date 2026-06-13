import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('cloudinary.cloudName'),
      api_key: this.configService.get<string>('cloudinary.apiKey'),
      api_secret: this.configService.get<string>('cloudinary.apiSecret'),
    });
  }

  async uploadImage(base64: string, folder = 'avatars'): Promise<string> {
    const result = await cloudinary.uploader.upload(base64, {
      folder: `strangerconnect/${folder}`,
      transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
    });
    return result.secure_url;
  }
}
