import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('otp_verifications')
export class OTPVerification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ type: 'enum', enum: ['email', 'phone'], default: 'email' })
  method: 'email' | 'phone';

  @Column({ length: 6 })
  code: string;

  @Column({ default: false })
  isUsed: boolean;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ nullable: true, type: 'timestamp' })
  usedAt: Date;
}
