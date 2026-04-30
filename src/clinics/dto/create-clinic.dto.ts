import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, MinLength } from 'class-validator';
import { ClinicPrivacy } from '../entities/clinic.entity';

export class CreateClinicDto {
  @ApiProperty({ example: 'Veterinaria Huellitas' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  name: string;

  @ApiProperty({ example: 'Especialistas en cirugía menor y vacunas.' })
  @IsString()
  @IsOptional()
  description: string;

  @ApiProperty({ example: 'Calle 10 #45, La Habana' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ enum: ClinicPrivacy, example: ClinicPrivacy.PUBLIC })
  @IsEnum(ClinicPrivacy)
  privacy: ClinicPrivacy;

  @ApiProperty({ 
    example: { monday: { open: '08:00', close: '17:00' }, tuesday: { open: '08:00', close: '17:00' } } 
  })
  @IsObject()
  @IsNotEmpty()
  workingHours: any;
}