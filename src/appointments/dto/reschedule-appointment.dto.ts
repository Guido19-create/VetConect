import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RescheduleAppointmentDto {
  @ApiProperty({ 
    description: 'Nueva fecha y hora para la cita (ISO 8601)', 
    example: '2026-06-15T10:30:00.000Z' 
  })
  @IsDateString({}, { message: 'La fecha debe tener un formato ISO válido' })
  new_date_time: string;

  @ApiProperty({ 
    description: 'Razón del cambio de horario', 
    example: 'El cliente no puede asistir por lluvia',
    required: false 
  })
  @IsString()
  @IsOptional()
  @MinLength(5)
  reschedule_reason?: string;
}