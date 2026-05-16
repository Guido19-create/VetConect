import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Conversation } from './conversation.entity';
import { User } from '../../users/entities/user.entity';

@Entity('Messages')
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, nullable: true, default: 'false' })
  is_read: string;

  @Column({ type: 'date', nullable: true })
  read_at: Date;

  @Column({ type: 'date', nullable: true })
  create_at: Date;

  @Column({ type: 'varchar', length: 255 })
  content: string;

  @Column({ type: 'varchar', nullable: true })
  fileUrl: string | null;

  @Column({ type: 'varchar', length: 20, default: 'text' })
  messageType: 'text' | 'file';

  @ManyToOne(() => Conversation, (conv) => conv.messages)
  @JoinColumn({ name: 'Conversationsid' })
  conversation: Conversation;

  @Column()
  Conversationsid: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'Usersid' })
  user: User; 

  @Column()
  Usersid: string;
}
