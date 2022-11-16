import { Gender } from './../../shared/enums/gender.enum';
import { JoinedFrom } from './../../shared/enums/joined-from.enum';
import { UserRole } from './../../shared/enums/user-roles.enum';
import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { VerificationCode } from '../../auth/entities/verification-code.entity';
import Audit from '../../shared/interface/audit.entity';
import { Education } from '../../education/entities/education.entity';
import { GeneralInformation } from '../../profile/entities/general-information.entity';
import { Language } from '../../language/entities/language.entity';
import { Training } from '../../training/entities/training.entity';
import { Opportunity } from '../../opportunity/entities/opportunity.entity';
import { EmploymentJourney } from '../../employment/entities/employment-journey.entity';
import { Interest } from '../../interests/entities/interest.entity';
import { Booking } from '../../opportunity/entities/booking.entity';
import { Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { Grade } from '../../assessment/entities/grades.entity';
import { AssessmentRequest } from '../../assessment/entities/assessment-request.entity';
import { CandidateOpportunity } from '../../opportunity/entities/candidate-opportunity.entity';
import { DrivingLicense } from '../../profile/entities/driving_lisence.entity';

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
  @Column({ name: 'first_name' })
  firstName: string;

  @ApiProperty()
  @Column({ name: 'last_name' })
  lastName: string;

  @ApiProperty()
  @Column({ nullable: true })
  gender: Gender;

  @ApiProperty()
  @Column({ name: 'phone_number', unique: true, nullable: false })
  phoneNumber: string;

  @ApiProperty()
  @Column({ default: false, nullable: true })
  verified: boolean;

  @ApiProperty()
  @Column({ name: 'is_approved', default: false, nullable: false })
  isApproved: boolean;

  @Column({ name: 'is_email_active', default: false, nullable: false })
  isEmailActive: boolean;

  @Column({ name: 'is_phone_number_active', default: false, nullable: false })
  isPhonenumberActive: boolean;

  @ApiProperty()
  @Column({ name: 'joined_from', default: JoinedFrom.ONLINE, nullable: true })
  joineFrom: JoinedFrom;

  @ApiProperty()
  @Column({ default: UserRole.CANDIDATE, nullable: false })
  role: UserRole;

  @ApiProperty()
  @Column({ name: 'is_active', default: true, nullable: false })
  isActive: boolean;

  @ApiProperty()
  @Column({
    name: 'agreed_with_terms_and_condition',
    default: false,
    nullable: false,
  })
  agreedWithTermsAndCondition: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  lastLogin: Date;

  @Column({ nullable: true })
  @Exclude()
  public currentHashedRefreshToken?: string;

  @OneToMany(() => VerificationCode, (code: VerificationCode) => code.user)
  public code: VerificationCode[];

  @OneToOne(
    () => GeneralInformation,
    (generalInfo: GeneralInformation) => generalInfo.user,
  )
  public generalInfo: GeneralInformation;

  @OneToMany(() => Education, (education: Education) => education.user)
  @JoinColumn()
  public education: Education[];

  @OneToMany(
    () => DrivingLicense,
    (drivingLicense: DrivingLicense) => drivingLicense.user,
  )
  @JoinColumn()
  public drivingLicense: DrivingLicense[];

  @OneToMany(() => Language, (language: Language) => language.user)
  @JoinColumn()
  public language: Language[];

  @OneToMany(() => Training, (training: Training) => training.user)
  public training: Training[];

  @OneToMany(
    () => Opportunity,
    (opportunity: Opportunity) => opportunity.createdBy,
    { cascade: true },
  )
  public opportunity: Opportunity[];

  @OneToMany(
    () => EmploymentJourney,
    (employmentJourney: EmploymentJourney) => employmentJourney.user,
  )
  @JoinColumn()
  public employmentJourney: EmploymentJourney[];

  @OneToMany(() => Interest, (interest: Interest) => interest.user)
  @JoinColumn()
  public interest: Interest[];

  @OneToMany(() => Booking, (booking: Booking) => booking.candidate)
  booking: Booking[];

  @OneToMany(() => Grade, (grade: Grade) => grade.candidate)
  public grade: Grade[];

  @OneToMany(
    () => AssessmentRequest,
    (assessmentRequest: AssessmentRequest) => assessmentRequest.candidate,
  )
  public assessmentRequest: AssessmentRequest[];

  @OneToMany(
    () => CandidateOpportunity,
    (dedicatedOpportunities: CandidateOpportunity) =>
      dedicatedOpportunities.candidate,
  )
  public dedicatedOpportunities: CandidateOpportunity[];
}
