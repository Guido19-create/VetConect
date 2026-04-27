// mfa-deactivate-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class MfaDeactivateResponseDto {
  @ApiProperty({
    example: 'MFA desactivado correctamente',
    description: 'Confirmación de la desactivación',
  })
  message: string;
}
