// src/conversations/dto/send-message.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, IsIn } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({
    description: 'UUID de la clínica veterinaria donde se desarrolla la conversación',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsNotEmpty()
  @IsUUID()
  clinicId: string;

  @ApiProperty({
    description: 'UUID del usuario receptor del mensaje (Cliente o Veterinario)',
    example: 'b123bc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  })
  @IsNotEmpty()
  @IsUUID()
  receiverId: string;

  @ApiPropertyOptional({
    description: 'Contenido de texto del mensaje. Opcional si se envía un archivo',
    example: 'Hola, adjunto el reporte clínico del paciente.',
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    description: 'URL del archivo subido (Gestionado internamente por el servidor en endpoints de carga)',
    example: 'https://minio.tuapp.com/chat-files/reporte_123.pdf',
  })
  @IsOptional()
  @IsString()
  fileUrl?: string;

  @ApiPropertyOptional({
    description: 'Tipo de mensaje para que el frontend renderice la burbuja adecuada',
    enum: ['text', 'file'],
    default: 'text',
    example: 'text',
  })
  @IsOptional()
  @IsString()
  @IsIn(['text', 'file'])
  messageType?: 'text' | 'file';
}