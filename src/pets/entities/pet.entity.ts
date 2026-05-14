import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { MedicalRecord } from './medical-record.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { Clinic } from '../../clinics/entities/clinic.entity';

export enum PetSex {
  MALE = 'macho',
  FEMALE = 'hembra',
}

@Entity('pets')
export class Pet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  species: string;

  @Column({ nullable: true })
  breed?: string;

  @Column({ type: 'int', nullable: true })
  age?: number;

  @Column({
    type: 'enum',
    enum: PetSex,
  })
  sex: PetSex;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  weight?: number;

  @Column({ nullable: true })
  photoURL?: string;

  @Column({ name: 'Clinicsid', nullable: true })
  clinicId: string;

  @ManyToOne(() => Clinic, (clinic) => clinic.pets)
  @JoinColumn({ name: 'clinicId' })
  clinic: Clinic;

  @ManyToMany(() => User, (user) => user.pets)
  @JoinTable({
    name: 'user_pets',
    joinColumn: { name: 'petId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'userId', referencedColumnName: 'id' },
  })
  owners: User[];

  @OneToOne(() => MedicalRecord, (medicalRecord) => medicalRecord.pet)
  medicalRecord: MedicalRecord;

  @OneToMany(() => Appointment, (appointment) => appointment.pet)
  appointments: Appointment[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}