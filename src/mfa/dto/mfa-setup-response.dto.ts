import { ApiProperty } from '@nestjs/swagger';

export class MfaSetupResponseDto {
  @ApiProperty({
    example: 'Escanea este código QR en tu App de Autenticación',
    description: 'Instrucciones para el usuario',
  })
  message: string;

  @ApiProperty({
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
    description:
      'Código QR en formato Data URL (Base64) para ser mostrado en una etiqueta <img>',
  })
  qrCode: string;
}
