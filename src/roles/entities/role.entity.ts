import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { UserClinicRole } from "../../clinics/entities/user-clinic-role.entity";

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  type: string;

  @OneToMany(() => UserClinicRole, (ucr) => ucr.role)
  userClinicRoles: UserClinicRole[];
}