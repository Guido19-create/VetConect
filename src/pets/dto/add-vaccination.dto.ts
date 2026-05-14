import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class AddVaccinationDto {
  @ApiProperty({ example: '2026-05-01' })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ example: '2026-11-01', required: false })
  @IsDateString()
  @IsOptional()
  nextDate?: string;

  @IsUUID()
  @IsNotEmpty()
  petId: string;
}