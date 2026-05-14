import { IsString, IsOptional, IsNotEmpty, MaxLength, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDailyAttendanceDto {
  @ApiProperty({ example: '2026-05-13', required: false })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiProperty({ example: 'Thor' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  patient_name: string;

  @ApiProperty({ example: 'Guido Garcia' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  owner_name: string;

  @ApiProperty({ example: 'macho' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  sex: string;

  @ApiProperty({ example: 'Canino' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  species: string;

  @ApiProperty({ example: 'Presenta cuadro de deshidratación leve', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  observations?: string;

  @ApiProperty({ example: 'Calle Falsa 123', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  address?: string;

  @ApiProperty({ example: 'uuid-clinica' })
  @IsString()
  @IsNotEmpty()
  clinicsId: string;
}