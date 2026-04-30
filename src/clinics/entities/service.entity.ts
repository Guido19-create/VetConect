import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Clinic } from './clinic.entity';

@Entity('services')
export class Service {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  icon_URL: string;

  @Column({ type: 'decimal', precision: 10, scale: 2,nullable:true })
  price: number;

  @Column()
  clinicId: string;

  @ManyToOne(() => Clinic, (clinic) => clinic.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clinicId' })
  clinic: Clinic;
}