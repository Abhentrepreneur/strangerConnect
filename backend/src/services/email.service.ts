import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('smtp.host');
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: this.configService.get<number>('smtp.port'),
        secure: false,
        auth: {
          user: this.configService.get<string>('smtp.user'),
          pass: this.configService.get<string>('smtp.pass'),
        },
      });
    }
  }

  async sendOtp(email: string, code: string): Promise<void> {
    const from = this.configService.get<string>('smtp.from');

    if (!this.transporter) {
      this.logger.warn(`SMTP not configured. OTP for ${email}: ${code}`);
      return;
    }

    await this.transporter.sendMail({
      from,
      to: email,
      subject: 'Your StrangerConnect Verification Code',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0A0A0A; color: #fff; border-radius: 16px;">
          <h1 style="background: linear-gradient(135deg, #7C3AED, #EC4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">StrangerConnect</h1>
          <p>Your verification code is:</p>
          <h2 style="font-size: 36px; letter-spacing: 8px; color: #06B6D4;">${code}</h2>
          <p style="color: #888;">This code expires in 10 minutes.</p>
        </div>
      `,
    });
  }
}
