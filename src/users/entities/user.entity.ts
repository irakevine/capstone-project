import { UserRole } from './../../shared/enums/user-roles.enum';
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import Audit from '../../shared/interface/audit.entity';
import { Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class User extends Audit {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty()
  @Column({ unique: true, nullable: false })
  email: string;

  @Column({ nullable: false })
  password: string;

  @ApiProperty()
  @Column({ name: 'first_name' })
  first_name: string;

  @ApiProperty()
  @Column()
  last_name: string;

  @ApiProperty()
  @Column({ unique: true, nullable: false })
  phone_number: string;


  @ApiProperty()
  @Column({ default: UserRole.STANDARD, nullable: false })
  role: UserRole;

  @ManyToOne(() => User, (user) => user.employee, {
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL',
  })
  manager: User;

  @OneToMany(() => User, (user) => user.manager)
  employee: User[];

  @ApiProperty()
  @Column({ default: false, nullable: true })
  active: boolean;

  @ApiProperty()
  @Column({ default: false, nullable: false })
  isVerified: boolean;

  @Column({ nullable: true })
  @Exclude()
  public currentHashedRefreshToken?: string;
}
