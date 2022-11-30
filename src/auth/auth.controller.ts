import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseFilters,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiTags,
} from '@nestjs/swagger';
import { HttpExceptionFilter } from '../shared/filters/http-exception.filter';
import { CreateUserDto } from './../users/dto/create-user.dto';
import { AuthService } from './auth.service';
import { GenericResponse } from '../shared/interface/generic-response.interface';
import { User } from '../users/entities/user.entity';
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
  @ApiConflictResponse({ description: 'User registered successfully' })
  @ApiBadRequestResponse({ description: 'Bad request' })
  @HttpCode(HttpStatus.CREATED)
  @Post('/register')
  async registerCandidate(
    @Body() createUserDto: CreateUserDto,
  ): Promise<GenericResponse<void>> {
    const result =await this.authService.registrUser(createUserDto)
    return {
      message: "User registered successfully",
      results: result,
    };
  }
}
