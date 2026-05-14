import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
} from '@nestjs/common';
import { RatingsService } from './ratings.service';
import { CreateRatingDto } from './dto/create-rating.dto';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { ReplyRatingDto } from './dto/reply-rating.dto';

@Controller('ratings')
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Post()
  @ApiOperation({
    summary: 'Registrar una nueva calificación',
    description:
      'Permite a los propietarios valorar la atención de una clínica enviando una puntuación del 1 al 5 y un comentario opcional.',
  })
  @ApiBody({
    type: CreateRatingDto,
    description: 'Datos necesarios para crear la valoración de la clínica',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'La valoración ha sido creada exitosamente.',
    schema: {
      example: {
        id: 1,
        punctuation: 5,
        comment: 'Excelente atención para mi mascota',
        Clinicsid: 'uuid-clinica-123',
        Usersid: 'uuid-usuario-456',
        create_at: '2026-05-06T10:00:00Z',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'Error de validación en los datos enviados o la clínica ya fue valorada por este usuario.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No se proporcionó un token válido.',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Error interno en el servidor.',
  })
  create(@Body() createRatingDto: CreateRatingDto, @GetUser() user: User) {
    return this.ratingsService.create(createRatingDto, user);
  }

  @Get('clinic/:clinicId')
  @ApiOperation({
    summary: 'Ver valoraciones públicas de una clínica',
    description:
      'Retorna el promedio de estrellas, total de votos y la lista de comentarios de una clínica.',
  })
  @ApiResponse({ status: 200, description: 'Datos obtenidos correctamente.' })
  getPublicRatings(@Param('clinicId') clinicId: string) {
    return this.ratingsService.getClinicPublicProfile(clinicId);
  }

  @Patch(':id/reply')
  @ApiOperation({
    summary: 'Responder a una reseña',
    description:
      'Permite al personal de la clínica responder a un comentario de un propietario.',
  })
  @ApiResponse({
    status: 200,
    description: 'Respuesta publicada correctamente.',
  })
  @ApiResponse({
    status: 403,
    description: 'No tienes permiso para responder a esta clínica.',
  })
  reply(
    @Param('id') id: number,
    @Body() replyDto: ReplyRatingDto,
    @GetUser() user: User,
  ) {
    return this.ratingsService.replyToRating(id, replyDto, user);
  }

  @Get('clinic/:clinicId/score')
  @ApiOperation({
    summary: 'Obtener promedio de puntuación',
    description:
      'Calcula el promedio redondeado a un decimal y el total de valoraciones de una clínica.',
  })
  @ApiResponse({ status: 200, description: 'Promedio calculado exitosamente.' })
  getScore(@Param('clinicId') clinicId: string) {
    return this.ratingsService.getClinicRatingSummary(clinicId);
  }
}
