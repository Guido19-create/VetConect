import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Clinic } from '../../clinics/entities/clinic.entity';

@Entity('ratings')
export class Rating {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  punctuation: number; 

  @Column({ type: 'varchar', length: 255, nullable: true })
  comment: string;

  @CreateDateColumn({ name: 'create_at' })
  createAt: Date;

  @UpdateDateColumn({ name: 'update_at' })
  updateAt: Date;

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

  @Column({ type: 'varchar', length: 500, nullable: true })
  reply: string;

  @Column({ type: 'timestamp', nullable: true })
  replyAt: Date;
}