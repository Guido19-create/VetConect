import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength } from 'class-validator';

export class UpdateMedicalRecordDto {
  @ApiProperty({
    description: 'Diagnóstico de las enfermedades o condiciones detectadas',
    example: 'Parvovirus canino en fase de recuperación, deshidratación leve.',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MinLength(3)
  diagnosis?: string;

  @ApiProperty({
    description: 'Tratamiento médico a seguir (medicamentos, dosis, frecuencia)',
    example: 'Continuar con hidratación oral y completar ciclo de antibióticos por 5 días.',
    required: false,
  })
  @IsString()
  @IsOptional()
  treatment?: string;

  @ApiProperty({
    description: 'Observaciones adicionales sobre el comportamiento o estado de la mascota',
    example: 'La mascota ya muestra interés por el alimento sólido.',
    required: false,
  })
  @IsString()
  @IsOptional()
  observations?: string;
}