import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Pet } from './pet.entity';
import { Vaccination } from './vaccination.entity';
import { Deworming } from './deworming.entity';

@Entity('medical_records')
export class MedicalRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'veterinary_care', nullable: true })
  veterinaryCare: string;

  @Column({ name: 'diseases_suffered', nullable: true })
  diseasesSuffered: string;

  @Column({ name: 'other_information', nullable: true })
  otherInformation?: string;

  @OneToOne(() => Pet, (pet) => pet.medicalRecord)
  @JoinColumn({ name: 'Petsid' })
  pet: Pet;

  @OneToMany(() => Vaccination, (v) => v.medicalRecord)
  vaccinations: Vaccination[];

  @OneToMany(() => Deworming, (d) => d.medicalRecord)
  dewormings: Deworming[];

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ nullable: true })
  lastModifiedBy: string;
}
