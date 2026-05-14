import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateAppointmentDto {
  @ApiProperty({ 
    example: '2026-05-20T15:30:00Z', 
    description: 'Fecha y hora programada para la cita' 
  })
  @IsDateString()
  @IsNotEmpty()
  date_time: string;

  @ApiProperty({ 
    example: 'Control post-operatorio y retiro de puntos', 
    description: 'Motivo detallado de la consulta' 
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  reason: string;

  @ApiProperty({ 
    example: '6bd25d44-77d9-4f11-b938-8d726188de86', 
    description: 'ID único de la mascota (UUID)' 
  })
  @IsUUID()
  @IsNotEmpty()
  petId: string;

  @ApiProperty({
    description:'ID unico de la clinica',
    example:'6bd25d44-77d9-4f11-b938-8d726188de86'
  })
  @IsUUID()
  @IsNotEmpty()
  clinicId:string
}