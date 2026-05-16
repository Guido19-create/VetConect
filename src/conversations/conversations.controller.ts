import { 
  Controller, 
  Post, 
  Body, 
  Get, 
  Param, 
  Patch, 
  UseGuards, 
  ParseIntPipe, 
  HttpStatus, 
  FileTypeValidator,
  MaxFileSizeValidator,
  ParseFilePipe,
  UploadedFile,
  UseInterceptors,
  BadRequestException
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth, 
  ApiParam, 
  ApiConsumes,
  ApiBody
} from '@nestjs/swagger';
import { ChatService } from './conversations.service';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../auth/decorators/jwt.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('Chat - Comunicación en tiempo real')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('send')
  @ApiOperation({ 
    summary: 'Enviar mensaje / Iniciar Chat', 
    description: 'Envía un mensaje de texto. Si la conversación entre el propietario y la clínica no existe, se crea automáticamente (RF-CH-01).' 
  })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Mensaje enviado y guardado con éxito.' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'No puedes enviarte mensajes a ti mismo o datos inválidos.' })
  sendMessage(
    @Body() dto: SendMessageDto, 
    @GetUser() sender: User
  ) {
    return this.chatService.sendMessage(dto, sender);
  }

  @Get('conversations')
  @ApiOperation({ 
    summary: 'Listar conversaciones del usuario', 
    description: 'Obtiene todas las conversaciones activas donde el usuario participa, ya sea como propietario o como veterinario.' 
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Lista de conversaciones recuperada.' })
  getConversations(@GetUser() user: User) {
    return this.chatService.getUserConversations(user.id);
  }

  @Get('history/:conversationId')
  @ApiOperation({ 
    summary: 'Obtener historial de mensajes (RF-CH-04)', 
    description: 'Recupera todos los mensajes de una conversación específica ordenados cronológicamente.' 
  })
  @ApiParam({ name: 'conversationId', description: 'ID numérico de la conversación' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Historial recuperado con éxito.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'La conversación no existe.' })
  getHistory(
    @Param('conversationId', ParseIntPipe) conversationId: number
  ) {
    return this.chatService.getChatHistory(conversationId);
  }

  @Patch('read/:conversationId')
  @ApiOperation({ 
    summary: 'Marcar conversación como leída (RF-CH-02)', 
    description: 'Actualiza todos los mensajes recibidos en una conversación al estado leido: true.' 
  })
  @ApiParam({ name: 'conversationId', description: 'ID numérico de la conversación' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Estado de lectura actualizado.' })
  markRead(
    @Param('conversationId', ParseIntPipe) conversationId: number, 
    @GetUser() user: User
  ) {
    return this.chatService.markAsRead(conversationId, user.id);
  }


@Post('upload-file')
  @ApiOperation({ 
    summary: 'Compartir archivos dentro del chat (Solo personal veterinario / staff)', 
    description: 'Recibe un archivo adjunto binario y delega las reglas de negocio al servicio de mensajería.' 
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Esquema híbrido que fusiona el archivo físico con los metadatos del DTO',
    schema: {
      type: 'object',
      required: ['file', 'clinicId', 'receiverId'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Archivo físico (Formatos: jpg, jpeg, png, pdf. Tamaño máx: 10MB)',
        },
        clinicId: {
          type: 'string',
          format: 'uuid',
          description: 'UUID de la clínica donde se contextualiza la conversación',
        },
        receiverId: {
          type: 'string',
          format: 'uuid',
          description: 'UUID del usuario destino del archivo',
        },
        content: {
          type: 'string',
          description: 'Mensaje o comentario opcional que acompaña al archivo',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Archivo procesado, cargado en MinIO y despachado con éxito.',
    schema: {
      example: {
        conversation: {
          id: 12,
          Clinicsid: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          Usersid: 'b123bc99-9c0b-4ef8-bb6d-6bb9bd380a22',
          Usersid2: 'c456bc99-9c0b-4ef8-bb6d-6bb9bd380a33',
          last_message: '📁 Archivo enviado',
          notifications_enabled: 'true',
          updated_at: '2026-05-16T20:30:00.000Z'
        },
        message: {
          id: 455,
          Conversationsid: 12,
          Usersid: 'b123bc99-9c0b-4ef8-bb6d-6bb9bd380a22',
          content: 'Compartió un archivo: examen_clinico.pdf',
          fileUrl: 'https://minio.tuapp.com/chat-files/examen_clinico_17158914.pdf',
          messageType: 'file',
          is_read: 'false',
          create_at: '2026-05-16T20:30:00.000Z'
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Petición inválida: El archivo excede dimensiones/formatos permitidos o falló la lógica de asignación.' })
  @ApiResponse({ status: 403, description: 'Acción denegada: El remitente no es staff activo de la clínica.' })
  @ApiResponse({ status: 404, description: 'No encontrado: No se localizó al usuario receptor.' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadChatFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // Bloqueo estricto a 10MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|pdf)$/ }), // Extensiones permitidas
        ],
      }),
    ) file: Express.Multer.File,
    @Body() dto: SendMessageDto,
    @GetUser() sender: User,
  ) {
    // Invocamos el nuevo método de servicio que centraliza la lógica del archivo
    return await this.chatService.sendFileMessage(dto, file, sender);
  }
}