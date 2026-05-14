import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { UserClinicRole } from './user-clinic-role.entity';
import { Service } from './service.entity';
import { Pet } from '../../pets/entities/pet.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { Rating } from '../../ratings/entities/rating.entity';
import { DailyAttendance } from '../../daily-attendance/entities/daily-attendance.entity';

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

  @Column({ type: 'text', nullable: true })
  logoURL?: string;

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

  @Column()
  ownerId: string;

  @OneToMany(() => UserClinicRole, (userClinicRole) => userClinicRole.clinic, {
    cascade: true
  })
  userRoles: UserClinicRole[];

  @OneToMany(() => Pet, (pet) => pet.clinic)
  pets: Pet[];

  @OneToMany(() => Appointment, (appointment) => appointment.clinic)
  appointments: Appointment[];

  @OneToMany(() => Service, (service) => service.clinic)
  services: Service[];

  @OneToMany(() => Rating, (rating) => rating.clinic)
  ratings: Rating[];

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => DailyAttendance, (attendance) => attendance.clinic)
  dailyAttentions: DailyAttendance[];
}