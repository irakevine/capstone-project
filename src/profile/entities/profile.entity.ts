import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { Department } from '../../department/entities/department.entity';
import Audit from '../../shared/interface/audit.entity';
import { User } from '../../users/entities/user.entity';

@Entity()
export class Profile extends Audit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  resident_country: string;

  @Column()
  birth_country: string;

  @Column()
  national_id: string;

  @Column()
  position: string;

  @Column()
  postal_code: string;

  @Column()
  starting_date: Date;

  @Column()
  profession: string;

  @ManyToOne(() => Department, (department) => department.profiles)
  department: Department;

  @Column()
  salary: string;

  @Column()
  father_name: string;

  @Column()
  mother_name: string;

  @Column()
  gender: string;

  @Column()
  birth_date: string;

  @Column()
  province: string;

  @Column()
  district: string;

  @OneToOne(() => User, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn()
  user: User;
}
