import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { RefreshToken } from '../../auth/entities/refresh-token.entity';
import { RecoveryToken } from '../../auth/entities/recovery-token.entity';
import { Optional } from '@nestjs/common';
import { UserClinicRole } from '../../clinics/entities/user-clinic-role.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude()
  password: string;

  @Column({ name: 'name' })
  name: string;

  @Column({ name: 'phone' })
  phone: string;

  @Column({ name: 'location' })
  location: string;

  @Optional()
  @Column({ name: 'avatar_URL' ,nullable: true})
  avatarURl?: string;

  @Column({ name: 'isActive', default: false })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ nullable: true })
  twoFactorIv: string;

  @Column({ type: 'varchar', nullable: true, unique: true })
  socialProviderId: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    enum: ['local', 'google', 'apple'],
    default: 'local',
  })
  socialProvider: 'local' | 'google' | 'apple' | null;


  @Column({ nullable: true })
  @Exclude()
  twoFactorSecret?: string;

  @Column({ default: false })
  isMfaEnabled: boolean;

  @OneToMany(() => RefreshToken, (refreshToken) => refreshToken.user)
  refreshTokens: RefreshToken[];

  @OneToMany(() => RecoveryToken, (token) => token.user)
  recoveryTokens: RecoveryToken[];

  @OneToMany(() => UserClinicRole, (userClinicRole) => userClinicRole.user)
  clinicRoles: UserClinicRole[];
}
