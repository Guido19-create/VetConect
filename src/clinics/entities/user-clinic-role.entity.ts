import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Clinic } from './clinic.entity';
import { Role } from '../../roles/entities/role.entity';

@Entity('user_clinic_roles')
export class UserClinicRole {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: Boolean, default: true })
  isActive: boolean;

  @Column()
  clinicId: string;

  @ManyToOne(() => User, (user) => user.clinicRoles)
  user: User;

  @ManyToOne(() => Clinic, (clinic) => clinic.userRoles, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'clinicId' })
  clinic: Clinic;

  @ManyToOne(() => Role, (role) => role.userClinicRoles, { eager: true })
  role: Role;
}