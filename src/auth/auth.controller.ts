import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseFilters,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiNotFoundResponse,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { HttpExceptionFilter } from '../shared/filters/http-exception.filter';
import { CreateUserDto } from './../users/dto/create-user.dto';
import { AuthService } from './auth.service';
import { GenericResponse } from '../shared/interface/generic-response.interface';
import { User } from '../users/entities/user.entity';
import { getGenericResponseSchema } from '../shared/util/swagger.util';
import { RequestVerificationCode } from './dto/request-verification-code.dto';
import { LoginDto } from './dto/login.dto';
import { Response } from 'express';
import { Patch, UseGuards } from '@nestjs/common/decorators';
import { GetUser } from './decorators/get-user.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
@UseFilters(HttpExceptionFilter)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiCreatedResponse({
    description: 'User registered successfully',
    ...getGenericResponseSchema(User),
  })
  @ApiExtraModels(User)
  @ApiConflictResponse({ description: 'User registered successfully' })
  @ApiBadRequestResponse({ description: 'Bad request' })
  @HttpCode(HttpStatus.CREATED)
  @Post('/register')
  async registerUser(
    @Body() createUserDto: CreateUserDto,
  ): Promise<GenericResponse<void>> {
    const result = await this.authService.registerUser(createUserDto);
    return {
      message: 'User registered successfully',
      results: result,
    };
  }

  @ApiCreatedResponse({
    description: 'Account verified successfully please login',
    ...getGenericResponseSchema(),
  })
  @ApiUnauthorizedResponse({ description: 'Invalid verification code' })
  @ApiBadRequestResponse({ description: 'Bad request' })
  @ApiQuery({ name: 'code' })
  @HttpCode(HttpStatus.OK)
  @Patch('/verify')
  async verification(
    @Query() query: { code: string },
  ): Promise<GenericResponse<string>> {
    console.log(query);
    await this.authService.verification(query.code);
    return {
      message: 'Account verified successfully please login',
      results: null,
    };
  }

  @ApiCreatedResponse({
    description: 'Login successfully',
    ...getGenericResponseSchema(User),
  })
  @ApiExtraModels(User)
  @ApiConflictResponse({ description: 'User logged in successfully' })
  @ApiBadRequestResponse({ description: 'Bad request' })
  @HttpCode(HttpStatus.CREATED)
  @Post('/login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<GenericResponse<any>> {
    const results = await this.authService.login(loginDto);
    response.cookie('accessToken', results.accessToken, {
      secure: true,
      httpOnly: true,
      sameSite: 'none',
    });
    response.cookie('refreshToken', results.refreshToken, {
      secure: true,
      httpOnly: true,
      sameSite: 'none',
    });
    return {
      message: 'Login successfully',
      results: { refreshToken: results.refreshToken, user: results.user },
    };
  }

  @ApiCreatedResponse({
    description: 'Reset Password code sent successfully',
    ...getGenericResponseSchema(User),
  })
  @ApiExtraModels(User)
  @ApiConflictResponse({ description: 'verification code sent successfully' })
  @ApiBadRequestResponse({ description: 'Bad request' })
  @HttpCode(HttpStatus.CREATED)
  @Post('/forgotPassword')
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<GenericResponse<any>> {
    const result = await this.authService.forgotPassword(
      forgotPasswordDto.email,
    );
    return {
      message: 'Reset Password code sent successfully',
      results: result,
    };
  }

  @ApiCreatedResponse({
    description: 'password reset successfully',
    ...getGenericResponseSchema(User),
  })
  @ApiExtraModels(User)
  @ApiConflictResponse({ description: 'password changed successfully' })
  @ApiBadRequestResponse({ description: 'Bad request' })
  @HttpCode(HttpStatus.OK)
  @Patch('/resetPassword')
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<GenericResponse<any>> {
    await this.authService.resetPassword(resetPasswordDto);
    return {
      message: 'password reset successfully',
      results: null,
    };
  }

  @ApiCreatedResponse({
    description: 'code sent successfully',
    ...getGenericResponseSchema(),
  })
  @ApiNotFoundResponse({ description: 'No email or phone found' })
  @ApiBadRequestResponse({ description: 'Bad request' })
  @HttpCode(HttpStatus.CREATED)
  @Post('/resend-code')
  async requestVerification(
    @Body() resendCodeDto: RequestVerificationCode,
  ): Promise<GenericResponse<string>> {
    await this.authService.requestVerification(resendCodeDto);
    return { message: 'Verification code sent', results: '' };
  }

  @ApiCreatedResponse({
    description: 'Password changed successfully',
    ...getGenericResponseSchema(User),
  })
  @ApiExtraModels(User)
  @ApiCookieAuth()
  @ApiBadRequestResponse({ description: 'Bad request' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @Patch('/changePassword')
  async changePassword(
    @GetUser() user: User,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<GenericResponse<any>> {
    console.log(user);
    await this.authService.changePassword(user.id, changePasswordDto);
    return {
      message: 'password changed successfully',
      results: null,
    };
  }
}
