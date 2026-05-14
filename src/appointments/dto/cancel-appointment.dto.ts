import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelAppointmentDto {
  @ApiProperty({ 
    example: 'Emergencia familiar del propietario', 
    description: 'Motivo por el cual se cancela la cita (opcional)',
    required: false 
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason_cancellation?: string;
}