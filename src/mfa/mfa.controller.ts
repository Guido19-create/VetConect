import { Body, Controller, Post, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MfaService } from './mfa.service';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { MfaSetupResponseDto } from './dto/mfa-setup-response.dto';
import { MfaActivateDto, MfaActivateResponseDto } from './dto/mfa-activate.dto';
import { MfaDeactivateResponseDto } from './dto/mfa-deactivate-response.dto';
import { ClientIp } from '../common';

@ApiTags('mfa-setup')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('mfa')
export class MfaController {
  constructor(private readonly mfaService: MfaService) {}

  @Post('setup')
  @ApiOperation({
    summary: 'Generar el QR para configuración de MFA',
  })
  @ApiResponse({
    status: 201,
    description: 'Código QR generado correctamente.',
    type: MfaSetupResponseDto, 
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - Token JWT faltante o inválido.',
  })
  async setupMfa(
    @Request() req,
    @ClientIp() ipAddress: string,
  ): Promise<MfaSetupResponseDto> {
    const qrCode = await this.mfaService.generateMfaSecret(req.user, ipAddress);

    return {
      message:
        'Escanea este código QR en tu App de Autenticación (Google Authenticator, Authy, etc.)',
      qrCode,
    };
  }

  @Post('activate')
  @ApiOperation({
    summary: ' Confirmar primer código y activar MFA',
    description:
      'Valida el código TOTP enviado por el usuario. Si es correcto, activa permanentemente el segundo factor de autenticación en su perfil.',
  })
  @ApiBody({ type: MfaActivateDto })
  @ApiResponse({
    status: 200,
    description: 'MFA activado correctamente.',
    type: MfaActivateResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Código de verificación inválido o expirado.',
  })
  async activateMfa(
    @Request() req,
    @Body() dto: MfaActivateDto,
    @ClientIp() ipAddress: string,
  ): Promise<MfaActivateResponseDto> {
    return this.mfaService.activateMfa(req.user.id, dto.code, ipAddress);
  }

  @Post('deactivate')
  @ApiOperation({
    summary: 'Desactivar MFA',
    description:
      'Deshabilita el segundo factor de autenticación y elimina el secreto y el IV asociados al usuario para mayor seguridad.',
  })
  @ApiResponse({
    status: 200,
    description:
      'MFA desactivado y datos de autenticación limpiados correctamente.',
    type: MfaDeactivateResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - Sesión inválida.',
  })
  async deactivateMfa(
    @Request() req,
    @ClientIp() ipAddress: string,
  ): Promise<MfaDeactivateResponseDto> {
    await this.mfaService.deactivateMfa(req.user.id, ipAddress);
    return { message: 'MFA desactivado correctamente' };
  }
}
