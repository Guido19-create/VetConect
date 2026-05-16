import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './conversations.service';
import { SendMessageDto } from './dto/send-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Repository } from 'typeorm';
import { forwardRef, Inject, Logger } from '@nestjs/common';

// Interfaz extendida para guardar datos del usuario directamente en la instancia del socket
interface AuthenticatedSocket extends Socket {
  userId?: string;
  senderUser?: User;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: 'chat'
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: ChatService,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const userId = client.handshake.query.userId as string;

      console.log('gcuwegpcpepwbecpu9w')
      if (!userId) {
        this.logger.error('Conexión rechazada: No se proporcionó userId');
        client.disconnect();
        return;
      }

      this.logger.log(`Intentando conectar usuario: ${userId}`);

      // Buscamos al usuario en la DB
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['clinicRoles'], // Asegúrate de que se llame exactamente así en tu User entity
      });

      if (!user) {
        this.logger.error(
          `Conexión rechazada: El usuario con ID ${userId} no existe en la base de datos.`,
        );
        client.disconnect();
        return;
      }

      // Guardamos en el socket
      client.userId = userId;
      client.senderUser = user;

      // Unir a la sala
      await client.join(`user_${userId}`);
      this.logger.log(`Usuario autenticado y unido a sala: user_${userId}`);
    } catch (error) {
      // Este log te dirá en tu terminal la verdad absoluta de por qué se cae
      this.logger.error(
        `Error crítico en handleConnection: ${error}`,
      );
      client.disconnect();
    }
  }
  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(
      `Cliente desconectado: ${client.userId || 'Usuario no autenticado'}`,
    );
  }

  @SubscribeMessage('send_message')
  async handleIncomingMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: SendMessageDto,
  ) {
    const sender = client.senderUser;

    if (!sender) {
      return { event: 'error', data: 'Usuario no autenticado en el socket' };
    }

    return await this.chatService.sendMessage(payload, sender);
  }

  sendMessage(receiverId: string, data: any) {
    this.server.to(`user_${receiverId}`).emit('new_message', data);
    this.logger.log(`Mensaje emitido a la sala: user_${receiverId}`);
  }
}
