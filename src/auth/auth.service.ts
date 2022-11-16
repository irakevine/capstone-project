import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import {
  ACCOUNT_ALREADY_VERIFIED,
  INVALID_CREDENTIAL,
  INVALID_VERIFICATION_CODE,
  SUCCESS_SIGNUP,
  UNVERIFIED_ACCOUNT,
  VERIFICATION_CODE_EXPIRED,
  VERIFICATION_EMAIL_SUBJECT,
  ACCOUNT_IN_DORMANT_MODE,
  NO_ACCESS_TO_THE_PORTAL,
} from './../shared/constants/auth.constants';
import { CreateUserDto } from './../users/dto/create-user.dto';
import { JwtService } from '@nestjs/jwt';
import { SendGrindService } from '../notifications/sendgrid.service';
import { emailVerificationTemplate } from './../shared/templates/email-verification';
import { codeGenerator } from '../shared/util/code-generator';
import { RequestVerificationCode } from './dto/request-verification-code.dto';
import { Connection } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { VerificationCode } from './entities/verification-code.entity';
import { VerifyBy } from '../shared/enums/verify-by.enum';
import { LoginDto } from './dto/login.dto';
import { BcryptService } from '../shared/util/bcrypt.service';
import { USER_NOT_FOUND } from '../shared/constants/user.constants';
import { ResetPasswordRequestDto } from './dto/reset-password-request.dto';
import { ResetPasswordDto } from './dto/change-password';
import { EMAIL_REGEX } from '../shared/constants/regex.constant';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '../shared/enums/user-roles.enum';
import { ChangePasswordDto } from './dto/change-password.dto';
import { TokenPayload } from './interfaces/jwt.payload.interface';
import { omit } from 'lodash';
import { SmsService } from '../notifications/sms.service';
import { isBefore, formatISO, addDays } from 'date-fns';
import { resetPasswordTemplate } from '../shared/templates/reset-password';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly sendGridService: SendGrindService,
    private readonly connection: Connection,
    @InjectRepository(VerificationCode)
    private readonly verificationCodeRepository: Repository<VerificationCode>,
    private readonly smsService: SmsService,
    private readonly configService: ConfigService,
    private readonly bcryptService: BcryptService,
  ) {}

  async register(createUserDto: CreateUserDto): Promise<any> {
    createUserDto.password = await this.bcryptService.hash(
      createUserDto.password,
    );
    await this.connection.transaction(async (manager) => {
      const user = await manager.save(User, {
        ...omit(createUserDto, ['agreed']),
        agreedWithTermsAndCondition: createUserDto.agreed,
      });
      const verificationCode: string = codeGenerator();
      const verificationCodeEntry = {
        code: verificationCode,
        expiryDate: formatISO(new Date(addDays(new Date(), 1)), {
          representation: 'complete',
        }),
        user: user,
      };
      const userVerificationCode = await manager.save(
        VerificationCode,
        verificationCodeEntry,
      );
      if (createUserDto.verifyBy === VerifyBy.BY_EMAIL) {
        const verificationMail = {
          to: user.email,
          subject: VERIFICATION_EMAIL_SUBJECT,
          from: this.configService.get<string>('SENT_EMAIL_FROM'),
          text: `Hello verify the account`,
          html: emailVerificationTemplate(
            user.firstName,
            userVerificationCode.code,
          ),
        };
        await this.sendGridService.send(verificationMail);
      }

      if (createUserDto.verifyBy === VerifyBy.BY_PHONE) {
        this.smsService.send(
          createUserDto.phoneNumber,
          `Hello ${user.firstName} use the code below to verify your Harambee account. CODE: ${userVerificationCode.code}`,
        );
      }
    });
    return {
      message: SUCCESS_SIGNUP,
      results: null,
    };
  }

  async verification(verificationCode): Promise<any> {
    const { code } = verificationCode;
    const result = await this.verificationCodeRepository.findOne({
      where: { code: code },
      relations: ['user'],
    });
    if (!result) {
      throw new UnauthorizedException(INVALID_VERIFICATION_CODE);
    }
    if (!(await this.checkCodeExpiry(result))) {
      throw new UnauthorizedException(VERIFICATION_CODE_EXPIRED);
    }
    await this.userRepository.update(
      { id: result.user.id },
      { verified: true },
    );
    await this.verificationCodeRepository.delete({
      id: result.id,
    });
    const accessToken = this.getJwtAccessToken(
      result.user.id,
      result.user.role,
    );
    const refreshToken = this.getJwtRefreshToken(
      result.user.id,
      result.user.role,
    );
    return {
      accessToken,
      refreshToken,
      user: omit(result.user, ['password', 'currentHashedRefreshToken']),
    };
  }

  async candidateLogin(loginDto: LoginDto): Promise<any> {
    let result;
    const { username, password } = loginDto;
    await this.connection.transaction(async (manager) => {
      const user = await this.findUserByEmailOrPhoneNumber(username);
      if (!user) {
        throw new ForbiddenException(INVALID_CREDENTIAL);
      } else {
        if (user.role !== UserRole.CANDIDATE) {
          throw new ForbiddenException(NO_ACCESS_TO_THE_PORTAL);
        }
        const isMatch = await this.bcryptService.compare(
          password,
          user.password,
        );
        if (!isMatch) {
          throw new ForbiddenException(INVALID_CREDENTIAL);
        }
        if (!user.verified) {
          throw new ForbiddenException(UNVERIFIED_ACCOUNT);
        }
        if (!user.isActive) {
          throw new ForbiddenException(ACCOUNT_IN_DORMANT_MODE);
        }
        const accessToken = this.getJwtAccessToken(user.id, user.role);
        const refreshToken = this.getJwtRefreshToken(user.id, user.role);
        await this.setCurrentRefreshToken(refreshToken, user.id);
        const now = new Date();
        await manager.update(User, { id: user.id }, { lastLogin: now });
        result = {
          accessToken,
          refreshToken,
          user: omit(user, ['password', 'currentHashedRefreshToken']),
        };
      }
    });
    return result;
  }

  async adminLogin(loginDto: LoginDto): Promise<any> {
    let result;
    const { username, password } = loginDto;
    await this.connection.transaction(async (manager) => {
      const user = await this.findUserByEmailOrPhoneNumber(username);
      if (!user) {
        throw new UnauthorizedException(INVALID_CREDENTIAL);
      } else {
        if (user.role === UserRole.CANDIDATE) {
          throw new UnauthorizedException(NO_ACCESS_TO_THE_PORTAL);
        }
        const isMatch = await this.bcryptService.compare(
          password,
          user.password,
        );
        if (!isMatch) {
          throw new UnauthorizedException(INVALID_CREDENTIAL);
        }
        if (!user.verified) {
          throw new UnauthorizedException(UNVERIFIED_ACCOUNT);
        }
        if (!user.isActive) {
          throw new UnauthorizedException(ACCOUNT_IN_DORMANT_MODE);
        }
        const accessToken = this.getJwtAccessToken(user.id, user.role);
        const refreshToken = this.getJwtRefreshToken(user.id, user.role);
        await this.setCurrentRefreshToken(refreshToken, user.id);
        const now = new Date();
        await manager.update(User, { id: user.id }, { lastLogin: now });
        result = {
          accessToken,
          refreshToken,
          user: omit(user, ['password', 'currentHashedRefreshToken']),
        };
      }
    });
    return result;
  }

  async logout(id: number): Promise<void> {
    await this.userRepository.update(
      {
        id: id,
        currentHashedRefreshToken: Not('null'),
      },
      {
        currentHashedRefreshToken: null,
      },
    );
  }

  async refreshTokenService(user: User): Promise<any> {
    const accessToken = this.getJwtAccessToken(user.id, user.role);
    return { accessToken };
  }

  async requestVerification(
    requestVerificationCodeDto: RequestVerificationCode,
  ): Promise<void> {
    const { username } = requestVerificationCodeDto;
    const user = await this.findUserByEmailOrPhoneNumber(username);
    if (!user) {
      throw new UnauthorizedException(USER_NOT_FOUND);
    }
    if (user.verified) {
      throw new BadRequestException(ACCOUNT_ALREADY_VERIFIED);
    }
    const verificationCodeEntry = {
      code: codeGenerator(),
      expiryDate: formatISO(new Date(addDays(new Date(), 1)), {
        representation: 'complete',
      }),
      user: user,
    };
    await this.verificationCodeRepository.delete({ user: user });
    const verificationCode = await this.verificationCodeRepository.save(
      verificationCodeEntry,
    );
    if (this.checkUsenameIsEmail(username)) {
      const verificationMail = {
        to: user.email,
        subject: VERIFICATION_EMAIL_SUBJECT,
        from: process.env.SENT_EMAIL_FROM,
        text: `Hello verify the account`,
        html: emailVerificationTemplate(user.firstName, verificationCode.code),
      };
      await this.sendGridService.send(verificationMail);
    }

    if (this.checkUsenameIsPhone(username)) {
      this.smsService.send(
        user.phoneNumber,
        `Hello ${user.firstName} use the code below to verify your harambee account. CODE: ${verificationCode.code}`,
      );
    }
  }

  async changePassword(
    user: User,
    changePasswordDto: ChangePasswordDto,
  ): Promise<User> {
    const { currentPassword, newPassword } = changePasswordDto;
    const result = await this.userRepository.findOne({ id: user.id });
    const isMatch = await this.bcryptService.compare(
      currentPassword,
      user.password,
    );
    if (newPassword === currentPassword) {
      throw new BadRequestException(
        'Current password can not be equal to the new password',
      );
    }
    if (!isMatch) {
      throw new BadRequestException(
        'Provided current Password does not much the existing one',
      );
    } else {
      const hash = await this.bcryptService.hash(newPassword);
      result.password = hash;
      const information = await this.userRepository.save(result);
      return information;
    }
  }

  async forgotPassword(
    resetPasswordRequestDto: ResetPasswordRequestDto,
  ): Promise<any> {
    const { username } = resetPasswordRequestDto;
    const user = await this.findUserByEmailOrPhoneNumber(username);
    if (!user) {
      throw new NotFoundException(USER_NOT_FOUND);
    }
    await this.verificationCodeRepository.delete({ user: user });
    const verificationEntry = {
      code: codeGenerator(),
      expiryDate: formatISO(new Date(addDays(new Date(), 1)), {
        representation: 'complete',
      }),
      user: user,
    };
    const verificationCode = await this.verificationCodeRepository.save(
      verificationEntry,
    );
    if (this.checkUsenameIsEmail(username)) {
      const resetEmail = {
        to: user.email,
        subject: 'REST PASSWORD',
        from: process.env.SENT_EMAIL_FROM,
        text: `Reset password.`,
        html: resetPasswordTemplate(user.firstName, verificationCode.code),
      };
      await this.sendGridService.send(resetEmail);
    }
    if (this.checkUsenameIsPhone(username)) {
      this.smsService.send(
        user.phoneNumber,
        `Hello ${user.firstName} use the code below to reset password for your harambee account. CODE: ${verificationCode.code}`,
      );
    }
  }

  async resetPassword(
    code: string,
    resetPasswordDto: ResetPasswordDto,
  ): Promise<void> {
    const { password } = resetPasswordDto;
    const result = await this.verificationCodeRepository.findOne({
      where: { code: code },
      relations: ['user'],
    });
    if (!result) {
      throw new UnauthorizedException('Invalid reset code');
    }
    if (!(await this.checkCodeExpiry(result))) {
      throw new UnauthorizedException(VERIFICATION_CODE_EXPIRED);
    }
    const newHash = await this.bcryptService.hash(password);
    await this.verificationCodeRepository.delete({
      id: result.id,
    });
    await this.userRepository.update(
      { id: result.user.id },
      { password: newHash },
    );
  }

  async checkCodeExpiry(data: VerificationCode): Promise<boolean> {
    if (isBefore(new Date(), new Date(data.expiryDate))) {
      return true;
    }
    return false;
  }

  checkUsenameIsEmail(username: string): boolean {
    if (EMAIL_REGEX.test(username)) {
      return true;
    } else {
      return false;
    }
  }

  checkUsenameIsPhone(username: string): boolean {
    username = username.split(' ').join('');
    if (username.startsWith('+250') && username.length === 13) {
      return true;
    } else {
      return false;
    }
  }

  async findUserByEmailOrPhoneNumber(username: string) {
    if (
      !this.checkUsenameIsEmail(username) &&
      !this.checkUsenameIsPhone(username)
    ) {
      throw new BadRequestException('Please use either email or phonenumber');
    }
    let user = null;
    if (this.checkUsenameIsEmail(username)) {
      user = await this.userRepository.findOne({
        email: username,
      });
    }
    if (this.checkUsenameIsPhone(username)) {
      user = await this.userRepository.findOne({
        phoneNumber: username,
      });
    }
    return user;
  }

  public getJwtAccessToken(userId: number, role: UserRole): string {
    const payload: TokenPayload = { id: userId, role: role };
    const token = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_TOKEN_SECRET'),
      expiresIn: this.configService.get<string>(
        'JWT_ACCESS_TOKEN_EXPIRATION_TIME',
      ),
    });
    return token;
  }

  public getJwtRefreshToken(userId: number, role: UserRole): string {
    const payload: TokenPayload = { id: userId, role: role };
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_TOKEN_SECRET'),
      expiresIn: this.configService.get<string>(
        'JWT_REFRESH_TOKEN_EXPIRATION_TIME',
      ),
    });
    return refreshToken;
  }

  async setCurrentRefreshToken(refreshToken: string, userId: number) {
    const currentHashedRefreshToken = await this.bcryptService.hash(
      refreshToken,
    );
    await this.userRepository.update(userId, {
      currentHashedRefreshToken,
    });
  }

  async checkIfRefreshTokenMatching(
    refreshToken: string,
    hashedRefreshedToken: string,
  ): Promise<boolean> {
    const isRefreshTokenMatching = await this.bcryptService.compare(
      refreshToken,
      hashedRefreshedToken,
    );
    return isRefreshTokenMatching;
  }
}
