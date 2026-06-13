import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { ReportRepository } from '../../repositories/report.repository';
import { CreateReportDto } from './dto/report.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly reportRepository: ReportRepository) {}

  async createReport(reporterId: string, dto: CreateReportDto) {
    const report = await this.reportRepository.create({
      reporterId: new Types.ObjectId(reporterId),
      reportedUserId: new Types.ObjectId(dto.reportedUserId),
      reason: dto.reason,
      description: dto.description,
      sessionId: dto.sessionId,
    });

    // AI moderation hook - integrate with moderation service
    await this.runModerationHook(report._id.toString(), dto);

    return { message: 'Report submitted successfully', reportId: report._id.toString() };
  }

  private async runModerationHook(reportId: string, dto: CreateReportDto): Promise<void> {
    // Placeholder for AI moderation integration (e.g., OpenAI Moderation API, AWS Rekognition)
    console.log(`[Moderation Hook] Report ${reportId} flagged for reason: ${dto.reason}`);
  }
}
