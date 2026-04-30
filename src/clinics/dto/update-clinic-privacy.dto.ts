import { IsEnum } from 'class-validator';
import { ClinicPrivacy } from '../entities/clinic.entity';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateClinicPrivacyDto {
  @ApiProperty({ 
    enum: ClinicPrivacy, 
    example: ClinicPrivacy.PUBLIC,
    description: 'Define si la clínica aparece en búsquedas globales o requiere invitación'
  })
  @IsEnum(ClinicPrivacy)
  privacy: ClinicPrivacy;
}