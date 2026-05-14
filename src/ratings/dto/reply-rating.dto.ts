import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReplyRatingDto {
  @ApiProperty({ 
    example: 'Muchas gracias por su comentario, nos alegra que Thor esté bien.', 
    description: 'Respuesta del veterinario (máximo 500 caracteres)' 
  })
  @IsString()
  @MinLength(5, { message: 'La respuesta es demasiado corta.' })
  @MaxLength(500, { message: 'La respuesta no puede exceder los 500 caracteres.' })
  reply: string;
}