import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { SendGrindService } from '../notifications/sendgrid.service';
import { User } from '../users/entities/user.entity';
import { BcryptService } from '../shared/util/bcrypt.service';
import { ConfigService } from '@nestjs/config';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { omit } from 'lodash';
import { codeGenerator } from 'src/shared/util/code-generator';
import { addMinutes, formatISO, isBefore } from 'date-fns';

import {
  ACCOUNT_IN_DORMANT_MODE,
  INVALID_VERIFICATION_CODE,
  UNVERIFIED_ACCOUNT,
  VERIFICATION_CODE_EXPIRED,
  VERIFICATION_EMAIL_SUBJECT,
} from 'src/shared/constants/auth.constants';

import { USER_NOT_FOUND } from 'src/shared/constants/user.constants';
import { EMAIL_REGEX } from 'src/shared/constants/regex.constant';
import { Code } from 'src/users/entities/code.entity';
import { UserRole } from '../shared/enums/user-roles.enum';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { verify_account_template } from '../shared/templates/verfy-account-email';
import { reset_password_template } from '../shared/templates/reset-password-template';
import { RequestVerificationCode } from './dto/request-verification-code.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Code)
    private readonly verificationCodeRepository: Repository<Code>,
    private readonly jwtService: JwtService,
    private readonly sendGridService: SendGrindService,
    private readonly configService: ConfigService,
    private readonly bcryptService: BcryptService,
  ) {}

  async registerUser(createUserDto: CreateUserDto): Promise<any> {
    const user = { ...createUserDto };
    user.password = await this.bcryptService.hash(user.password);
    if (await this.checkUserExisting(user.email)) {
      throw new ConflictException('User with this email already exist.');
    } else {
      const registeredUser = await this.userRepository.save({
        email: user.email,
        password: user.password,
        phone_number: user.phone_number,
        first_name: user.first_name,
        last_name: user.last_name,
        manager: null,
        role: UserRole.STANDARD,
      });
      const verificationCode = codeGenerator();
      await this.verificationCodeRepository.save({
        code: verificationCode,
        user: registeredUser,
        expiryDate: formatISO(addMinutes(new Date(), 60), {
          representation: 'complete',
        }),
      });
      const verificationMail = {
        to: user.email,
        subject: VERIFICATION_EMAIL_SUBJECT,
        from: this.configService.get<string>('SENT_EMAIL_FROM'),
        text: `Hello verify the account`,
        html: verify_account_template(verificationCode),
      };
      await this.sendGridService.send(verificationMail);
      return omit(registeredUser, ['password', 'currentHashedRefreshToken']);
    }
  }

  async verification(code: string): Promise<void> {
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
      { isVerified: true, active: true },
    );
    await this.verificationCodeRepository.delete({
      id: result.id,
    });
  }

  async login(loginDto: LoginDto) {
    const user = await this.findUserByEmail(loginDto.email);
    const isPasswordValid = await this.bcryptService.compare(
      loginDto.password,
      user?.password ? user.password : 'no password',
    );
    if (!user || !isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.isVerified) {
      throw new UnauthorizedException(UNVERIFIED_ACCOUNT);
    }
    if (!user.active) {
      throw new UnauthorizedException(ACCOUNT_IN_DORMANT_MODE);
    }
    const results = {
      accessToken: await this.getJwtAccessToken(user),
      refreshToken: await this.getJwtRefreshToken(user),
    };
    await this.setCurrentHashedRefreshToken(results.refreshToken, user.id);
    return {
      ...results,
      user: omit(user, ['password', 'currentHashedRefreshToken']),
    };
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.findUserByEmail(email);
    if (!user) {
      throw new ConflictException('User not found');
    }
    if (!user.isVerified) {
      throw new ConflictException(UNVERIFIED_ACCOUNT);
    }
    const resetCode = codeGenerator();
    await this.verificationCodeRepository.save({
      code: resetCode,
      user: user,
      expiryDate: formatISO(addMinutes(new Date(), 60), {
        representation: 'complete',
      }),
    });
    const verificationMail = {
      to: user.email,
      subject: `RESET PASSWORD`,
      from: this.configService.get<string>('SENT_EMAIL_FROM'),
      text: `RESET PASSWORD`,
      html: reset_password_template(resetCode),
    };
    await this.sendGridService.send(verificationMail);
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    const code = await this.verificationCodeRepository.findOne({
      where: { code: resetPasswordDto.code },
      relations: ['user'],
    });
    if (!code) {
      throw new UnauthorizedException(INVALID_VERIFICATION_CODE);
    }
    if (!(await this.checkCodeExpiry(code))) {
      throw new UnauthorizedException(VERIFICATION_CODE_EXPIRED);
    }
    await this.userRepository.update(
      { id: code.user.id },
      { password: await this.bcryptService.hash(resetPasswordDto.newPassword) },
    );
  }

  async setCurrentHashedRefreshToken(refreshToken: string, id: number) {
    const hashedRefreshToken = await this.bcryptService.hash(refreshToken);
    await this.userRepository.update(
      { id: id },
      { currentHashedRefreshToken: hashedRefreshToken },
    );
  }

  async checkUserExisting(email: string): Promise<boolean> {
    const user = await this.userRepository.findOne({ email: email });
    if (user) {
      return true;
    } else {
      return false;
    }
  }
  async requestVerification(
    resendCodeDto: RequestVerificationCode,
  ): Promise<void> {
    const user = await this.findUserByEmail(resendCodeDto.email);
    if (!user) {
      throw new UnauthorizedException(USER_NOT_FOUND);
    }
    const verificationCodeEntry = {
      code: codeGenerator(),
      expiryDate: formatISO(addMinutes(new Date(), 60), {
        representation: 'complete',
      }),
      user: user,
    };
    await this.verificationCodeRepository.delete({ user: user });
    await this.verificationCodeRepository.save(verificationCodeEntry);
    const verificationMail = {
      to: user.email,
      subject: VERIFICATION_EMAIL_SUBJECT,
      from: process.env.SENT_EMAIL_FROM,
      text: 'Code Sent',
      html: verify_account_template(verificationCodeEntry.code),
    };
    await this.sendGridService.send(verificationMail);
  }

  async findUserByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findOne({
      email: email,
    });
    return user;
  }

  checkDataIsEmail(email: string): boolean {
    if (EMAIL_REGEX.test(email)) {
      return true;
    } else {
      return false;
    }
  }

  checkDataIsPhone(phone: string): boolean {
    phone = phone.split(' ').join('');
    if (phone.startsWith('+250') && phone.length === 13) {
      return true;
    } else {
      return false;
    }
  }

  public getJwtAccessToken(user: User): string {
    const payload = { id: user.id, email: user.email, role: user.role };
    const token = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_TOKEN_SECRET'),
      expiresIn: this.configService.get<string>(
        'JWT_ACCESS_TOKEN_EXPIRATION_TIME',
      ),
    });
    return token;
  }

  public getJwtRefreshToken(user: User): string {
    const payload = { id: user.id, email: user.email, role: user.role };
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_TOKEN_SECRET'),
      expiresIn: this.configService.get<string>(
        'JWT_REFRESH_TOKEN_EXPIRATION_TIME',
      ),
    });
    return refreshToken;
  }
  async checkCodeExpiry(data: Code): Promise<boolean> {
    if (isBefore(new Date(), new Date(data.expiryDate))) {
      return true;
    }
    return false;
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

  async changePassword(
    userId: number,
    psdDto: ChangePasswordDto,
  ): Promise<void> {
    const user = await this.userRepository.findOne({ id: userId });
    if (
      !(await this.bcryptService.compare(psdDto.currentPassword, user.password))
    ) {
      throw new ConflictException('The current is invalid');
    }
    if (psdDto.currentPassword === psdDto.newPassword) {
      throw new ConflictException("The current and new passwords can't match");
    }
    await this.userRepository.update(
      { id: user.id },
      { password: await this.bcryptService.hash(psdDto.newPassword) },
    );
  }
}
