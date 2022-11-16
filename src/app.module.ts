
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { runtimeConfig } from './shared/config/app.config';
import { TypeOrmFactoryConfigService } from './shared/config/typeorm-factory-config.service';
import { DatabaseExceptionFilter } from './shared/filters/database-exception.filter';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter';
import { AuditInterceptor } from './shared/interceptors/audit.interceptor';
import { ClassTransformInterceptor } from './shared/interceptors/class-transform.interceptor';
import { ResponseTransformInterceptor } from './shared/interceptors/response-transform.interceptor';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { BcryptService } from './shared/util/bcrypt.service';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [runtimeConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useClass: TypeOrmFactoryConfigService,
    }),
    AuthModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_FILTER, useClass: DatabaseExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ResponseTransformInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ClassTransformInterceptor },
    AppService,
    UserSeedService,
    SpecializationPreferenceSeedService,
    EducationPreferenceSeedService,
    LanguagePreferenceSeedService,
    GradingPreferenceSeedService,
    OpportunityTypePreferenceSeedService,
    EmploymentStatusPreferenceSeedService,
    AssessmentRequestSeedService,
    AssessmentSeedService,
    GradesSeedService,
    BcryptService,
    InterestPreferenceSeedService,
    ProgramPreferenceSeedService,
  ],
})
export class AppModule implements OnApplicationBootstrap {
  constructor(
    private readonly userSeedService: UserSeedService,
    private readonly educationSeedService: EducationPreferenceSeedService,
    private readonly specializationSeedService: SpecializationPreferenceSeedService,
    private readonly languageSeedService: LanguagePreferenceSeedService,
    private readonly gradingSeedService: GradingPreferenceSeedService,
    private readonly opportunityTypePreferenceSeedService: OpportunityTypePreferenceSeedService,
    private readonly employmentStatusSeedService: EmploymentStatusPreferenceSeedService,
    private readonly gradesSeedService: GradesSeedService,
    private readonly assessmentSeedService: AssessmentSeedService,
    private readonly assessmentRequestSeedService: AssessmentRequestSeedService,
    private readonly interestPreferenceSeedService: InterestPreferenceSeedService,
    private readonly programPreferenceSeedService: ProgramPreferenceSeedService,
  ) {}
  async onApplicationBootstrap() {
    await this.userSeedService.seed();
    await this.educationSeedService.seed();
    await this.languageSeedService.seed();
    await this.specializationSeedService.seed();
    await this.gradingSeedService.seed();
    await this.opportunityTypePreferenceSeedService.seed();
    await this.employmentStatusSeedService.seed();
    await this.assessmentSeedService.seed();
    await this.assessmentRequestSeedService.seed();
    await this.interestPreferenceSeedService.seed();
    await this.programPreferenceSeedService.seed();
  }
}
