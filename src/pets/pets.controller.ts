import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpStatus,
  HttpCode,
  Patch,
  UseInterceptors,
  ParseUUIDPipe,
  Param,
  UploadedFile,
  ParseFilePipe,
  FileTypeValidator,
  MaxFileSizeValidator,
  Get,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiParam,
} from '@nestjs/swagger';
import { PetsService } from './pets.service';
import { CreatePetDto } from './dto/create-pet.dto';
import { JwtAuthGuard } from '../auth/decorators/jwt.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { AddVaccinationDto } from './dto/add-vaccination.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AddDewormingDto } from './dto/add-deworming.dto';
import { UpdateMedicalRecordDto } from './dto/update-medical-record.dto';

@ApiTags('Medical Records / Pets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pets')
export class PetsController {
  constructor(private readonly petsService: PetsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Registrar mascota (RF-HC-01)',
    description: `Permite registrar una mascota. 
    - Si el usuario es ADMINISTRADOR o VETERINARIO: Puede enviar un 'ownerId' para vincular la mascota a un cliente.
    - Si el usuario es CLIENTE: El 'ownerId' es opcional y el sistema lo vinculará automáticamente a su perfil.`,
  })
  @ApiBody({
    type: CreatePetDto,
    description:
      'Datos de la mascota. El ownerId es opcional dependiendo del rol del usuario.',
    examples: {
      registroPorVeterinario: {
        summary: 'Veterinario registrando a un cliente',
        value: {
          name: 'Thor',
          species: 'Perro',
          sex: 'macho',
          age: 3,
          ownerId: 'cbc0ad7d-ac9a-477e-8a84-1972a4e0ef34',
        },
      },
      registroPorCliente: {
        summary: 'Cliente registrando su propia mascota',
        value: {
          name: 'Kira',
          species: 'Gato',
          sex: 'hembra',
          age: 2,
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'La mascota ha sido registrada exitosamente.',
    schema: {
      example: {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        name: 'Thor',
        owners: [{ id: 'uuid-del-dueño', name: 'Nombre del Dueño' }],
        createdAt: '2026-05-01T12:00:00Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos.' })
  @ApiResponse({
    status: 404,
    description: 'El ownerId proporcionado no existe.',
  })
  async create(@Body() createPetDto: CreatePetDto, @GetUser() user: User) {
    return await this.petsService.create(createPetDto, user);
  }

  @Patch(':id/photo')
  @UseInterceptors(FileInterceptor('photo'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Actualizar foto de perfil (RF-HC-01)',
    description:
      'Permite subir la foto de la mascota. Autorizado para Dueños, Veterinarios y Administradores.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        photo: {
          type: 'string',
          format: 'binary',
          description: 'Archivo de imagen (png, jpg, jpeg)',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Foto actualizada exitosamente.' })
  @ApiResponse({
    status: 403,
    description: 'Usuario no autorizado para esta acción.',
  })
  async uploadPetPhoto(
    @Param('id', new ParseUUIDPipe()) id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 5 }),
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg)' }),
        ],
      }),
    )
    photo: Express.Multer.File,
    @GetUser() user: User,
  ) {
    return await this.petsService.uploadPetPhoto(id, user, photo);
  }

  @Post('medical-record')
  @Roles('ADMIN', 'OWNER', 'VETERINARIAN', 'SUPERADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Registrar/Actualizar Historia Clínica (RF-HC-02)',
    description: `
      Permite al personal médico registrar la atención de una mascota.
      - **Roles permitidos**: ADMIN, VETERINARIAN, SUPERADMIN.
      - **Lógica**: Si la mascota no tiene expediente, se crea uno nuevo (Alta). Si ya tiene, se actualizan los campos con la información de la consulta actual.
    `,
  })
  @ApiBody({
    type: CreateMedicalRecordDto,
    description: 'Datos de la consulta médica',
    examples: {
      consultaGeneral: {
        summary: 'Ejemplo de registro de consulta',
        value: {
          petId: '81d95c31-805c-4ca2-9917-bfe68dc2478c',
          diagnosis: 'Parvovirus canino - Fase inicial',
          treatment:
            'Hospitalización, hidratación IV y protocolo de antibióticos',
          observations:
            'La mascota presenta deshidratación del 5%. Pronóstico reservado.',
          consultationDate: '2026-05-01',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Historia clínica registrada exitosamente.',
    schema: {
      example: {
        id: 1,
        veterinaryCare: 'Protocolo de antibióticos...',
        diseasesSuffered: 'Parvovirus canino...',
        otherInformation: 'Pronóstico reservado...',
        pet: { id: '81d95c31...' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description:
      'El usuario no tiene los roles necesarios (ADMIN, VETERINARIAN) o el rol no está activo.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description:
      'El petId proporcionado no corresponde a ninguna mascota registrada.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No se proporcionó un token válido.',
  })
  async createMedicalRecord(
    @Body() createMedicalRecordDto: CreateMedicalRecordDto,
    @GetUser('id') user: User,
  ) {
    return await this.petsService.createMedicalRecord(
      createMedicalRecordDto,
      user,
    );
  }

  @Post('vaccination')
  @Roles('ADMIN', 'OWNER', 'VETERINARIAN', 'SUPERADMIN')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('tag_photo'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Registrar Vacunación (RF-HC-03)',
    description:
      'Registra una vacuna en la historia clínica de la mascota y sube la foto de la etiqueta a MinIO.',
  })
  @ApiBody({
    description: 'Datos de la vacuna y archivo de imagen',
    schema: {
      type: 'object',
      required: ['petId', 'date', 'tag_photo'],
      properties: {
        petId: {
          type: 'string',
          format: 'uuid',
          description: 'ID de la mascota',
        },
        date: {
          type: 'string',
          format: 'date',
          description: 'Fecha de aplicación',
        },
        nextDate: {
          type: 'string',
          format: 'date',
          description: 'Fecha sugerida de refuerzo',
        },
        tag_photo: {
          type: 'string',
          format: 'binary',
          description: 'Imagen de la etiqueta de la vacuna',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Vacuna registrada con éxito.' })
  @ApiResponse({
    status: 403,
    description: 'No tiene permisos (Solo ADMIN, VETERINARIAN, SUPERADMIN).',
  })
  async addVaccination(
    @Body() dto: AddVaccinationDto,
    @GetUser('id') user: User,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 4 }),
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg)' }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return await this.petsService.addVaccination(dto, file, user);
  }

  @Post('deworming')
  @Roles('ADMIN', 'OWNER', 'VETERINARIAN', 'SUPERADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Registrar Desparasitación (RF-HC-04)',
    description:
      'Añade un registro de desparasitación al historial de la mascota. Requiere historia clínica previa.',
  })
  @ApiResponse({
    status: 201,
    description: 'Desparasitación registrada correctamente.',
  })
  @ApiResponse({
    status: 403,
    description: 'El usuario no tiene permisos suficientes.',
  })
  @ApiResponse({
    status: 400,
    description: 'La mascota no cuenta con un expediente clínico activo.',
  })
  async addDeworming(@Body() dto: AddDewormingDto) {
    return await this.petsService.addDeworming(dto);
  }


  @Get(':petId/medical-history')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'VETERINARIAN', 'SUPERADMIN', 'USER') 
  @ApiOperation({ 
    summary: 'Ver historia clínica completa (RF-HC-04)',
    description: 'Obtiene el expediente clínico detallado. Los veterinarios pueden ver cualquier mascota, los clientes solo las propias.' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Historial clínico recuperado exitosamente.' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Acceso denegado. No tienes permisos para ver esta mascota.' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'La mascota no existe o no tiene historial iniciado.' 
  })
  async getMedicalHistory(
    @Param('petId', ParseUUIDPipe) petId: string,
    @GetUser() user: User
  ) {
    return await this.petsService.getFullMedicalHistory(petId, user);
  }

  @Patch(':petId/medical-record')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'VETERINARIAN', 'SUPERADMIN')
  @ApiOperation({ 
    summary: 'Modificar registro clínico (RF-HC-05)',
    description: 'Permite editar diagnóstico, tratamiento y observaciones. Registra automáticamente quién realizó el cambio.' 
  })
  @ApiParam({ name: 'petId', description: 'UUID de la mascota', example: '6bd25d44-77d9-4f11-b938-8d726188de86' })
  @ApiResponse({ status: 200, description: 'Registro actualizado correctamente y auditoría generada.' })
  @ApiResponse({ status: 403, description: 'Solo el personal clínico puede modificar historias.' })
  @ApiResponse({ status: 404, description: 'No existe un expediente clínico para esta mascota.' })
  async updateMedicalRecord(
    @Param('petId', ParseUUIDPipe) petId: string,
    @Body() updateDto: UpdateMedicalRecordDto,
    @GetUser() user: User,
  ) {
    return await this.petsService.updateMedicalRecord(petId, updateDto, user);
  }
}
