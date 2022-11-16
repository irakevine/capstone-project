import { User } from '../../users/entities/user.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import Audit from '../../shared/interface/audit.entity';

@Entity()
export class VerificationCode extends Audit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'code', nullable: false })
  code: string;

  @Column({
    name: 'expiry_date',
    type: 'timestamptz',
    nullable: false,
    default: () => 'CURRENT_TIMESTAMP',
  })
  expiryDate: Date;

  @ManyToOne(() => User, (user: User) => user.code)
  user: User;
}
