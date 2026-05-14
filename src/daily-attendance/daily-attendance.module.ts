import { Module } from '@nestjs/common';
import { DailyAttentionService } from './daily-attendance.service';
import { DailyAttentionController } from './daily-attendance.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DailyAttendance } from './entities/daily-attendance.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DailyAttendance])],
  controllers: [DailyAttentionController],
  providers: [DailyAttentionService],
})
export class DailyAttendanceModule {}
