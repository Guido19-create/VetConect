// src/conversations/conversations.service.ts
import { Injectable, BadRequestException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { SendMessageDto } from './dto/send-message.dto';
import { User } from '../users/entities/user.entity';
import { ChatGateway } from './chat.gateway';
import { MinioService } from '../common/integrations/minio/minio.service';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    
    @Inject(forwardRef(() => ChatGateway)) 
    private readonly chatGateway: ChatGateway,

    private readonly minioService: MinioService,
  ) {}

  async sendMessage(dto: SendMessageDto, sender: User) {
    if (sender.id === dto.receiverId) {
      throw new BadRequestException('No puedes iniciar un chat contigo mismo.');
    }

    const isSenderStaff = sender.clinicRoles?.some(
      (role) => role.clinicId === dto.clinicId && role.isActive,
    );

    const receiver = await this.userRepository.findOne({
      where: { id: dto.receiverId },
      relations: ['clinicRoles'],
    });

    if (!receiver) {
      throw new NotFoundException('El usuario destino no existe.');
    }

    const isReceiverStaff = receiver.clinicRoles?.some(
      (role) => role.clinicId === dto.clinicId && role.isActive,
    );

    const receiverBelongsToClinic = receiver.clinicRoles?.some(
      (role) => role.clinicId === dto.clinicId,
    );
    if (!receiverBelongsToClinic) {
      throw new BadRequestException('El usuario destino no pertenece a esta clínica.');
    }

    if (!isSenderStaff && !isReceiverStaff) {
      throw new BadRequestException(
        'Acción denegada: Los usuarios estándar no pueden iniciar chats entre sí.',
      );
    }

    if (isSenderStaff && isReceiverStaff) {
      const sharedClinic = sender.clinicRoles.some(
        (sRole) => 
          sRole.clinicId === dto.clinicId && 
          sRole.isActive &&
          receiver.clinicRoles.some(
            (rRole) => rRole.clinicId === sRole.clinicId && rRole.isActive,
          ),
      );
      if (!sharedClinic) {
        throw new BadRequestException('No estás autorizado para hablar con personal de otra clínica.');
      }
    }

    // Ordenamiento absoluto de identificadores para garantizar una única conversación
    const [user1Id, user2Id] = [sender.id, dto.receiverId].sort();

    let conversation = await this.conversationRepository.findOne({
      where: {
        Clinicsid: dto.clinicId,
        Usersid: user1Id,
        Usersid2: user2Id,
      },
    });

    const summaryMessage = dto.messageType === 'file' ? '📁 Archivo enviado' : dto.content;

    if (!conversation) {
      conversation = this.conversationRepository.create({
        Clinicsid: dto.clinicId,
        Usersid: user1Id,
        Usersid2: user2Id,
        last_message: summaryMessage,
        notifications_enabled: 'true',
      });
      conversation = await this.conversationRepository.save(conversation);
    } else {
      await this.conversationRepository.update(conversation.id, {
        last_message: summaryMessage,
        updated_at: new Date(),
      });
    }

    // Guardado histórico en la tabla Messages
    const newMessage = await this.messageRepository.save(
      this.messageRepository.create({
        Conversationsid: conversation.id,
        Usersid: sender.id,
        content: dto.content || '',
        fileUrl: dto.fileUrl || null,
        messageType: dto.messageType || 'text',
        is_read: 'false',
      }),
    );

    // Emisión en tiempo real por canal WebSockets
    this.chatGateway.sendMessage(dto.receiverId, {
      id: newMessage.id,
      content: newMessage.content,
      fileUrl: newMessage.fileUrl,
      messageType: newMessage.messageType,
      senderName: sender.name,
      conversationId: conversation.id,
      createdAt: newMessage.create_at,
    });

    return { conversation, message: newMessage };
  }

  async getChatHistory(conversationId: number) {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId }
    });

    if (!conversation) {
      throw new NotFoundException('La conversación solicitada no existe.');
    }

    return await this.messageRepository.find({
      where: { Conversationsid: conversationId },
      order: { create_at: 'ASC' },
      relations: ['user'], 
    });
  }

  async markAsRead(conversationId: number, userId: string) {
    await this.messageRepository.update(
      {
        Conversationsid: conversationId,
        Usersid: Not(userId),
        is_read: 'false',
      },
      { is_read: 'true', read_at: new Date() },
    );
    return { success: true };
  }

  async getUserConversations(userId: string) {
    return await this.conversationRepository.find({
      where: [{ Usersid: userId }, { Usersid2: userId }],
      relations: ['clinic', 'user1', 'user2'],
      order: { updated_at: 'DESC' },
    });
  }


  async sendFileMessage(dto: SendMessageDto, file: Express.Multer.File, sender: User) {
    const isSenderStaff = sender.clinicRoles?.some(
      (role) => role.clinicId === dto.clinicId && role.isActive,
    );

    if (!isSenderStaff) {
      throw new BadRequestException('Acción denegada: Solo el personal veterinario puede compartir archivos.');
    }

    const bucketName = 'chat-files';
    const uploadedFileUrl = await this.minioService.uploadFile(file, bucketName);

    dto.fileUrl = uploadedFileUrl;
    dto.messageType = 'file';
    
    if (!dto.content) {
      dto.content = `Compartió un archivo: ${file.originalname}`;
    }

    return await this.sendMessage(dto, sender);
  }
}