import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { Clinic } from '../../clinics/entities/clinic.entity';
import { User } from '../../users/entities/user.entity';
import { Message } from './message.entity';

@Entity('Conversations')
export class Conversation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  last_message: string;

  @Column({ type: 'varchar', length: 255, nullable: true, default: 'true' })
  notifications_enabled: string;

  @Column({ type: 'date', nullable: true })
  created_at: Date;

  @Column({ type: 'date', nullable: true })
  updated_at: Date;

  @ManyToOne(() => Clinic)
  @JoinColumn({ name: 'Clinicsid' })
  clinic: Clinic;

  @Column()
  Clinicsid: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'Usersid' })
  user1: User; // Propietario

  @Column()
  Usersid: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'Usersid2' })
  user2: User; // Veterinario / Clínica

  @Column()
  Usersid2: string;

  @OneToMany(() => Message, (message) => message.conversation)
  messages: Message[];
}