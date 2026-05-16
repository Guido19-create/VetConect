// src/conversations/conversations.module.ts
import { Module } from '@nestjs/common';
import { ChatService } from './conversations.service';
import { ChatController } from './conversations.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { ChatGateway } from './chat.gateway';
import { User } from '../users/entities/user.entity';
import { MinioModule } from '../common/integrations/minio/minio.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, Message, User]),
    MinioModule
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService] 
})
export class ConversationsModule {}