import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Optional } from '@nestjs/common';
import { UserClinicRole } from './user-clinic-role.entity';
import { Service } from './service.entity';

export enum ClinicPrivacy {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

@Entity('clinics')
export class Clinic {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({type:'text',nullable:true})
  @Optional()
  logoURL?:string

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ClinicPrivacy,
    default: ClinicPrivacy.PUBLIC,
  })
  privacy: ClinicPrivacy;

  @Column({ type: 'jsonb', nullable: true })
  workingHours: any;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @OneToMany(() => UserClinicRole, (userClinicRole) => userClinicRole.clinic,{
    cascade: true
  })
  userRoles: UserClinicRole[];

  @Column()
  ownerId: string;

  @OneToMany(() => Service, (service) => service.clinic)
  services: Service[];

  @CreateDateColumn()
  createdAt: Date;
}