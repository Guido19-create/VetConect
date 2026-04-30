import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Clinic } from './clinic.entity';
import { Role } from '../../roles/entities/role.entity';
import { User } from '../../users/entities/user.entity';

@Entity('Invitation')
export class ClinicInvitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'token', unique: true })
  token: string;

  @Column({ name: 'type' })
  type: string;

  @Column({ default: 'PENDING' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  responsiveAt: Date;

  @ManyToOne(() => Clinic, (clinic) => clinic.id, { 
    onDelete: 'CASCADE' 
  })
  @JoinColumn({ name: 'clinicId' })
  clinic: Clinic;

  @ManyToOne(() => Role, (role) => role.id, {
    onDelete: 'RESTRICT'
  })
  @JoinColumn({ name: 'roleId' })
  role: Role;
 
  @ManyToOne(() => User, (user) => user.id, { 
    nullable: true, 
    onDelete: 'SET NULL' 
  })
  @JoinColumn({ name: 'userId' })
  user: User;
}