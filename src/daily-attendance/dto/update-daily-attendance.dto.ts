import { PartialType } from '@nestjs/swagger';
import { CreateDailyAttendanceDto } from './create-daily-attendance.dto';

export class UpdateDailyAttendanceDto extends PartialType(CreateDailyAttendanceDto) {}
