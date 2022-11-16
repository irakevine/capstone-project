import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Patch,
  UseFilters,
  Query,
  Get,
  UseGuards,
  Res,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  RESET_EMAIL_SENT,
  RESET_PASSWORD_SUCCESS,
} from '../shared/constants/auth.constants';
import { HttpExceptionFilter } from '../shared/filters/http-exception.filter';
import { CreateUserDto } from './../users/dto/create-user.dto';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RequestVerificationCode } from './dto/request-verification-code.dto';
import { ResetPasswordDto } from './dto/change-password';
import { ResetPasswordRequestDto } from './dto/reset-password-request.dto';
import { GenericResponse } from '../shared/interface/generic-response.interface';
import { GetUser } from './decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Response } from 'express';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import JwtRefreshGuard from './guards/jwt-refresh.guard';
import { getGenericResponseSchema } from '../shared/util/swagger.util';

@ApiTags('Authentication')
@Controller('auth')
@UseFilters(HttpExceptionFilter)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiCreatedResponse({
    description: 'Registered successfully',
    ...getGenericResponseSchema(User),
  })
  @ApiExtraModels(User)
  @ApiConflictResponse({ description: 'Candidate already exist' })
  @ApiBadRequestResponse({ description: 'Bad request' })
  @HttpCode(HttpStatus.CREATED)
  @Post('/register')
  async registerCandidate(
    @Body() createUserDto: CreateUserDto,
  ): Promise<GenericResponse<User>> {
    const results = await this.authService.register(createUserDto);
    return { message: 'Registered successfully', results };
  }

  @ApiCreatedResponse({
    description: 'Account verified',
    ...getGenericResponseSchema(),
  })
  @ApiUnauthorizedResponse({ description: 'Invalid verification code' })
  @ApiBadRequestResponse({ description: 'Bad request' })
  @ApiQuery({ name: 'code' })
  @HttpCode(HttpStatus.OK)
  @Get('/verify')
  async verification(
    @Query() code: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<GenericResponse<any>> {
    const results = await this.authService.verification(code);
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
      message: 'Account verified successfully',
      results: { refreshToken: results.refreshToken, user: results.user },
    };
  }

  @ApiCreatedResponse({
    description: 'Login successfully',
    ...getGenericResponseSchema(),
  })
  @ApiUnauthorizedResponse({ description: 'Un verified account' })
  @ApiBadRequestResponse({ description: 'Bad request' })
  @HttpCode(HttpStatus.CREATED)
  @Post('/candidate-login')
  async candidateLogin(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<GenericResponse<any>> {
    const results = await this.authService.candidateLogin(loginDto);
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
    description: 'Login successfully',
    ...getGenericResponseSchema(),
  })
  @ApiUnauthorizedResponse({ description: 'Un verified account' })
  @ApiBadRequestResponse({ description: 'Bad request' })
  @HttpCode(HttpStatus.CREATED)
  @Post('/admin-login')
  async adminLogin(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<GenericResponse<any>> {
    const results = await this.authService.adminLogin(loginDto);
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
    description: 'Refresh token successful',
    ...getGenericResponseSchema(),
  })
  @ApiUnauthorizedResponse({ description: 'You are requested to login' })
  @ApiBadRequestResponse({ description: 'Bad request' })
  @ApiCookieAuth()
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  @Get('/refresh-token')
  async refreshToken(
    @GetUser() user: User,
    @Res({ passthrough: true }) response: Response,
  ): Promise<GenericResponse<string>> {
    const results = await this.authService.refreshTokenService(user);
    response.cookie('accessToken', results.accessToken, {
      secure: true,
      httpOnly: true,
      sameSite: 'none',
    });
    return { message: 'Refresh token successful', results: '' };
  }

  @ApiCreatedResponse({
    description: 'logout successfully',
    ...getGenericResponseSchema(),
  })
  @ApiUnauthorizedResponse({ description: 'You are requested to login' })
  @ApiBadRequestResponse({ description: 'Bad request' })
  @ApiCookieAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @Post('/logout')
  async logout(
    @GetUser() user: User,
    @Res({ passthrough: true }) response: Response,
  ): Promise<GenericResponse<string>> {
    await this.authService.logout(user.id);
    response.clearCookie('accessToken');
    response.clearCookie('refreshToken');
    return { message: 'logout successfully', results: '' };
  }

  @ApiCreatedResponse({
    description: 'Verification code sent',
    ...getGenericResponseSchema(),
  })
  @ApiNotFoundResponse({ description: 'No email or phone found' })
  @ApiBadRequestResponse({ description: 'Bad request' })
  @HttpCode(HttpStatus.CREATED)
  @Post('/request-verification-code')
  async requestVerification(
    @Body() requestVerificationCodeDto: RequestVerificationCode,
  ): Promise<GenericResponse<string>> {
    await this.authService.requestVerification(requestVerificationCodeDto);
    return { message: 'Verification code sent', results: '' };
  }

  @ApiOkResponse({
    description: 'Reset code sent',
    ...getGenericResponseSchema(),
  })
  @ApiNotFoundResponse({ description: 'Not found' })
  @ApiBadRequestResponse({ description: 'Bad request' })
  @Post('/forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body() resetPasswordRequestDto: ResetPasswordRequestDto,
  ): Promise<GenericResponse<any>> {
    const results = await this.authService.forgotPassword(
      resetPasswordRequestDto,
    );
    return { message: RESET_EMAIL_SENT, results };
  }

  @ApiOkResponse({
    description: 'Password reset successful',
    ...getGenericResponseSchema(),
  })
  @ApiNotFoundResponse({ description: 'Not found' })
  @ApiBadRequestResponse({ description: 'Bad request' })
  @ApiQuery({ name: 'code', required: false })
  @Patch('/reset-password/')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Query('code') code: string,
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<GenericResponse<string>> {
    await this.authService.resetPassword(code, resetPasswordDto);
    return { message: RESET_PASSWORD_SUCCESS, results: '' };
  }

  @ApiOkResponse({
    description: 'Password has changed successfully',
    ...getGenericResponseSchema(),
  })
  @ApiBadRequestResponse({
    description: 'Provided current Password does not much the existing one',
  })
  @ApiCookieAuth()
  @UseGuards(JwtAuthGuard)
  @Post('/change-password')
  async changePassword(
    @GetUser() user: User,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<GenericResponse<any>> {
    const results = await this.authService.changePassword(
      user,
      changePasswordDto,
    );
    return { message: 'Password has changed successfully', results };
  }
}
