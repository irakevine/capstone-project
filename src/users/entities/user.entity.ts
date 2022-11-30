import { Gender } from './../../shared/enums/gender.enum';
import { UserRole } from './../../shared/enums/user-roles.enum';
import {
  Column,
  Entity,
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
  password?: string;

  @ApiProperty()
  @Column()
  firstName: string;

  @ApiProperty()
  @Column()
  lastName: string;

  @ApiProperty()
  @Column({ nullable: true })
  gender: Gender;

  @ApiProperty()
  @Column({ unique: true, nullable: false })
  phoneNumber: string;

  @ApiProperty()
  @Column({ default: false, nullable: true })
  isVerified: boolean;


  @ApiProperty()
  @Column({ default: UserRole.STANDARD, nullable: false })
  role: UserRole;

  @Column({ type: 'timestamptz', nullable: true })
  lastLogin: Date;

  @Column({ nullable: true })
  @Exclude()
  public currentHashedRefreshToken?: string;
}
