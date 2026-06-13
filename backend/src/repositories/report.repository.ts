import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Report, ReportDocument } from '../schemas/report.schema';

@Injectable()
export class ReportRepository {
  constructor(@InjectModel(Report.name) private readonly reportModel: Model<ReportDocument>) {}

  async create(data: Partial<Report>): Promise<ReportDocument> {
    const report = new this.reportModel(data);
    return report.save();
  }
}
