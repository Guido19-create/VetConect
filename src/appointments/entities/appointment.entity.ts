import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { Pet } from '../../pets/entities/pet.entity';
import { Clinic } from '../../clinics/entities/clinic.entity';

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'timestamp' })
  date_time: Date;

  @Column({ length: 255, default: 'scheduled' })
  states: string;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ name: 'clinicId' ,nullable: true})
  clinicId: string;

  @ManyToOne(() => Clinic, (clinic) => clinic.appointments)
  @JoinColumn({ name: 'clinicId' })
  clinic: Clinic;

  @Column()
  petId: string;

  @ManyToOne(() => Pet, (pet) => pet.appointments)
  pet: Pet;

  @CreateDateColumn()
  createdAt: Date;
}