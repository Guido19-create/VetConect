import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { MedicalRecord } from "./medical-record.entity";

@Entity('vaccination')
export class Vaccination {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date' })
  date: Date;

  @Column({ name: 'tag_photo', nullable: true })
  tagPhoto: string;

  @Column({ name: 'next_date', type: 'date', nullable: true })
  nextDate: Date | null;

  @ManyToOne(() => MedicalRecord, (mr) => mr.vaccinations)
  @JoinColumn({ name: 'Medical_Record' }) 
  medicalRecord: MedicalRecord;
}