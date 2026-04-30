import {
  Controller,
  Post,
  Body,
  Param,
  Req,
  UseGuards,
  HttpStatus,
  Patch,
  ParseUUIDPipe,
  Delete,
  Get,
  MaxFileSizeValidator,
  ParseFilePipe,
  UploadedFile,
  FileTypeValidator,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { ClinicsService } from './clinics.service';
import { CreateClinicDto } from './dto/create-clinic.dto';
import { ClientIp } from '../common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateWorkingHoursDto } from './dto/update-working-hours.dto';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { CreateServiceDto } from './dto/create-service.dto';
import { User } from '../users/entities/user.entity';
import { UpdateClinicPrivacyDto } from './dto/update-clinic-privacy.dto';

@ApiTags('Clinics')
@ApiBearerAuth()
@Controller('clinics')
export class ClinicsController {
  constructor(private readonly clinicsService: ClinicsService) {}

  @Post()
  @ApiOperation({
    summary: 'Crear una nueva clínica (RF-CL-01)',
    description:
      'Permite a un veterinario registrar su clínica y se asigna como dueño automáticamente.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Clínica creada exitosamente.',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'El nombre de la clínica ya existe.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datos de entrada inválidos.',
  })
  async create(@Body() createClinicDto: CreateClinicDto, @Req() req: any) {
    const userId = req.user.id;
    return await this.clinicsService.create(createClinicDto, userId);
  }

  @Post(':id/invite')
  @ApiOperation({
    summary: 'Enviar invitación a miembro (RF-CL-02)',
    description:
      'Genera un token único y envía un correo electrónico al usuario invitado con el rol especificado.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de la clínica',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        roleId: {
          type: 'string',
          example: 'uuid-del-rol',
          description: 'ID del rol a asignar',
        },
        userId: {
          type: 'string',
          example: 'uuid-del-usuario',
          description: 'ID del usuario en el sistema',
        },
      },
      required: ['roleId', 'userId'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Invitación enviada y encolada en Bull.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Clínica no encontrada.',
  })
  async invite(
    @Param('id') clinicId: string,
    @Body() inviteDto: { email: string; roleId: string; userId: string },
    @ClientIp() ip: string,
  ) {
    return await this.clinicsService.inviteMember(
      clinicId,
      inviteDto.roleId,
      inviteDto.userId,
      inviteDto.email,
    );
  }

  @Post('invitations/accept')
  @ApiOperation({
    summary: 'Aceptar invitación a una clínica (RF-CL-02)',
    description:
      'Valida el token de invitación y vincula al usuario con la clínica y el rol asignado.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        token: { type: 'string', example: 'uuid-generado-en-el-correo' },
      },
      required: ['token'],
    },
  })
  @ApiResponse({ status: 200, description: 'Miembro añadido correctamente.' })
  @ApiResponse({ status: 404, description: 'Token inválido o expirado.' })
  async accept(@Body('token') token: string) {
    return await this.clinicsService.acceptInvitation(token);
  }

  @Patch(':id/members/:userId/role')
  @ApiOperation({
    summary: 'Cambiar el rol de un miembro (RF-CL-03)',
    description:
      'Permite al administrador modificar el nivel de acceso de un miembro existente.',
  })
  @ApiParam({ name: 'id', description: 'ID de la clínica' })
  @ApiParam({
    name: 'userId',
    description: 'ID del usuario al que se le cambiará el rol',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { roleId: { type: 'string', example: 'uuid-del-nuevo-rol' } },
      required: ['roleId'],
    },
  })
  @ApiResponse({ status: 200, description: 'Rol actualizado exitosamente.' })
  @ApiResponse({ status: 404, description: 'Usuario o Rol no encontrado.' })
  async updateRole(
    @Param('id', new ParseUUIDPipe()) clinicId: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body('roleId', new ParseUUIDPipe()) roleId: string,
  ) {
    return await this.clinicsService.updateMemberRole(clinicId, userId, roleId);
  }

  @Delete(':id/members/:userId')
  @ApiOperation({
    summary: 'Eliminar un miembro de la clínica (RF-CL-04)',
    description:
      'Revoca el acceso de un usuario a la clínica eliminando su rol asociado.',
  })
  @ApiParam({ name: 'id', description: 'ID de la clínica' })
  @ApiParam({ name: 'userId', description: 'ID del usuario a eliminar' })
  @ApiResponse({ status: 200, description: 'Miembro eliminado con éxito.' })
  @ApiResponse({ status: 403, description: 'No se puede eliminar al dueño.' })
  @ApiResponse({ status: 404, description: 'Membresía no encontrada.' })
  async removeMember(
    @Param('id', new ParseUUIDPipe()) clinicId: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ) {
    return await this.clinicsService.removeMember(clinicId, userId);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Cerrar o reabrir clínica (RF-CL-05)',
    description:
      'Cambia el estado de la clínica. Si está cerrada, no aparecerá en búsquedas y no permitirá agendar nuevas citas.',
  })
  @ApiParam({ name: 'id', description: 'ID de la clínica' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { isActive: { type: 'boolean', example: false } },
      required: ['isActive'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Estado de la clínica actualizado correctamente.',
  })
  async updateStatus(
    @Param('id', new ParseUUIDPipe()) clinicId: string,
    @Body('isActive') isActive: boolean,
  ) {
    return await this.clinicsService.toggleClinicStatus(clinicId, isActive);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar clínica permanentemente (RF-CL-06)',
    description:
      'Elimina la clínica y todos sus datos. Requiere confirmación de contraseña del dueño.',
  })
  @ApiParam({ name: 'id', description: 'ID de la clínica a eliminar' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        password: { type: 'string', example: 'miPasswordSeguro123' },
      },
      required: ['password'],
    },
  })
  @ApiResponse({ status: 200, description: 'Clínica eliminada exitosamente.' })
  @ApiResponse({ status: 401, description: 'Contraseña incorrecta.' })
  @ApiResponse({ status: 403, description: 'El usuario no es el dueño.' })
  async removeClinic(
    @Param('id', new ParseUUIDPipe()) clinicId: string,
    @Body('password') password: string,
    @Req() req: any,
  ) {
    const ownerId = req.user.id;
    return await this.clinicsService.deleteClinic(clinicId, ownerId, password);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener perfil detallado de la clínica (RF-CL-07)',
    description:
      'Retorna toda la información pública de la clínica: descripción, horarios, servicios, ubicación y personal.',
  })
  @ApiParam({ name: 'id', description: 'UUID de la clínica' })
  @ApiResponse({
    status: 200,
    description: 'Datos detallados obtenidos con éxito.',
  })
  @ApiResponse({
    status: 404,
    description: 'Clínica no encontrada o inactiva.',
  })
  async getClinic(@Param('id', new ParseUUIDPipe()) id: string) {
    return await this.clinicsService.getClinicDetails(id);
  }

  @Patch(':id/logo')
  @UseInterceptors(FileInterceptor('logo'))
  @ApiOperation({
    summary: 'Configurar logo de la clínica (RF-PE-01)',
    description:
      'Sube un logo personalizado a MinIO. Formatos aceptados: JPG, PNG, SVG. Tamaño máximo: 2MB.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Archivo de imagen del logo',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'Logo actualizado exitosamente y URL guardada en base de datos.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Archivo inválido o demasiado pesado.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'La clínica no existe.',
  })
  async uploadLogo(
    @Param('id', new ParseUUIDPipe()) id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 2097152 }),
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg|svg)' }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return await this.clinicsService.uploadLogo(id, file);
  }

  @Patch(':id/working-hours')
  @ApiBody({
    description: 'Estructura semanal de horarios de la clínica',
    examples: {
      ejemploReal: {
        value: {
          monday: { open: '08:00', close: '18:00', isClosed: false },
          sunday: { open: '00:00', close: '00:00', isClosed: true },
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Configurar horarios de atención (RF-PE-02)',
    description:
      'Define apertura, cierre y días de descanso por cada día de la semana.',
  })
  @ApiResponse({ status: 200, description: 'Horarios actualizados con éxito.' })
  @ApiResponse({ status: 404, description: 'Clínica no encontrada.' })
  async updateWorkingHours(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateWorkingHoursDto: UpdateWorkingHoursDto,
    @Req() req: any,
  ) {
    const ownerId = req.user.id;
    return await this.clinicsService.updateWorkingHours(
      id,
      updateWorkingHoursDto,
      ownerId,
    );
  }

  @Post(':id/services')
  @ApiOperation({
    summary: 'Registrar nuevo servicio (RF-PE-03)',
    description:
      'Permite al administrador definir un nuevo servicio dentro de su catálogo. Incluye nombre, descripción y duración estimada.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de la clínica a la que se le asignará el servicio',
  })
  @ApiResponse({
    status: 201,
    description: 'El servicio ha sido creado exitosamente.',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Consulta General',
        description: 'Evaluación primaria de la mascota',
        duration: 30,
        clinicId: '347929fb-0440-4550-9095-a878be38736c',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos.' })
  @ApiResponse({
    status: 403,
    description: 'No tienes permisos para editar esta clínica.',
  })
  @ApiResponse({ status: 404, description: 'La clínica no existe.' })
  async addService(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() createServiceDto: CreateServiceDto,
    @GetUser('id') user: User,
  ) {
    return await this.clinicsService.addService(id, user, createServiceDto);
  }

  @Patch('services/:serviceId/icon')
  @UseInterceptors(FileInterceptor('icon'))
  @ApiOperation({
    summary: 'Subir ícono de servicio (RF-PE-03)',
    description:
      'Actualiza el ícono representativo de un servicio técnico/médico.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { icon: { type: 'string', format: 'binary' } },
    },
  })
  async uploadServiceIcon(
    @Param('serviceId', new ParseUUIDPipe()) serviceId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 2 }),
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg|svg)' }),
        ],
      }),
    )
    icon: Express.Multer.File,
    @GetUser('id') user: User,
  ) {
    return await this.clinicsService.uploadServiceIcon(serviceId, user, icon);
  }

  @Patch(':id/privacy')
  @ApiOperation({
    summary: 'Configurar privacidad (RF-PE-05)',
    description:
      'Cambia la visibilidad de la clínica entre Pública (visible en el buscador) y Privada (solo por invitación).',
  })
  async updatePrivacy(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updatePrivacyDto: UpdateClinicPrivacyDto,
    @GetUser() user: any,
  ) {
    return await this.clinicsService.updatePrivacy(
      id,
      user,
      updatePrivacyDto.privacy,
    );
  }
}
