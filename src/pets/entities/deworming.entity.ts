import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { MedicalRecord } from "./medical-record.entity";

@Entity('deworming')
export class Deworming {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date' })
  date: Date;

  @Column({ name: 'deworming_medication' })
  medication: string;

  @Column()
  dose: number;

  @Column({ name: 'next_date', type: 'date', nullable: true })
  nextDate: Date | null;

  @ManyToOne(() => MedicalRecord, (mr) => mr.dewormings)
  @JoinColumn({ name: 'Medical_Record' })
  medicalRecord: MedicalRecord;
}