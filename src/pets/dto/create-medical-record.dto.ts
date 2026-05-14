import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsUUID, IsDateString } from 'class-validator';

export class CreateMedicalRecordDto {
  @ApiProperty({ example: 'Infección respiratoria' })
  @IsString()
  @IsNotEmpty()
  diagnosis: string;

  @ApiProperty({ example: 'Antibióticos por 7 días' })
  @IsString()
  @IsNotEmpty()
  treatment: string;

  @ApiProperty({ example: 'Requiere control en 15 días', required: false })
  @IsString()
  @IsOptional()
  observations?: string; 

  @ApiProperty({ example: '2026-05-01', required: false })
  @IsDateString()
  @IsOptional()
  consultationDate?: string;

  @ApiProperty({ example: 'uuid-de-la-mascota' })
  @IsUUID()
  @IsNotEmpty()
  petId: string;
}