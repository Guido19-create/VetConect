import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Clinic } from '../../clinics/entities/clinic.entity';
import { User } from '../../users/entities/user.entity';

@Entity('Daily_Attendance')
export class DailyAttendance {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date', nullable: true })
  date: Date; 

  @Column({ type: 'varchar', length: 255 })
  patient_name: string;

  @Column({ type: 'varchar', length: 255 })
  owner_name: string;

  @Column({ type: 'varchar', length: 255 })
  sex: string; 

  @Column({ type: 'varchar', length: 255 })
  species: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  observations: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address: string;

  @ManyToOne(() => Clinic)
  @JoinColumn({ name: 'Clinicsid' })
  clinic: Clinic;

  @Column()
  Clinicsid: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'Usersid' })
  user: User;

  @Column()
  Usersid: string;
}