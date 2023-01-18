import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import {
  ApiExtraModels,
  ApiConflictResponse,
  ApiBadRequestResponse,
  ApiTags,
  ApiCookieAuth,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { Profile } from './entities/profile.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { getGenericResponseSchema } from 'src/shared/util/swagger.util';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/shared/enums/user-roles.enum';
import { RolesGuard } from 'src/auth/guards/roles.guard';

@ApiTags('profile')
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @ApiCreatedResponse({
    description: 'profile created successfully',
    ...getGenericResponseSchema(Profile),
  })
  @ApiExtraModels(Profile)
  @ApiConflictResponse({ description: '409.this user already has profile' })
  @ApiBadRequestResponse({ description: 'Bad request' })
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth()
  @UseGuards(JwtAuthGuard)
  @Post('')
  async create(
    @GetUser() user: User,
    @Body() createProfileDto: CreateProfileDto,
  ) {
    const result = await this.profileService.create(user, createProfileDto);
    return {
      message: 'Profile created successfully',
      results: result,
    };
  }
  @ApiCreatedResponse({
    description: 'User Profile',
    ...getGenericResponseSchema(Profile),
  })
  @ApiExtraModels(Profile)
  @ApiBadRequestResponse({ description: 'Bad request' })
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth()
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('')
  async findAll() {
    const result = await this.profileService.findAll();
    return {
      message: 'User Profile Retrieved succssfully',
      results: { ...result },
    };
  }
  @ApiCreatedResponse({
    description: 'profile retrieved successfully',
    ...getGenericResponseSchema(Profile),
  })
  @ApiExtraModels(Profile)
  @ApiBadRequestResponse({ description: 'Bad request' })
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth()
  @UseGuards(JwtAuthGuard)
  @Get('/:id')
  async findOne(@GetUser() user: User, @Param('id') id: string) {
    const result = await this.profileService.findOne(user.role, +id);
    return {
      message: 'User Profile Retrieved successfully',
      results: result,
    };
  }
  @ApiCookieAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('/:id')
  async update(
    @Param('id') id: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    const result = await this.profileService.update(+id, updateProfileDto);
    return {
      message: 'User Profile Updated successfully',
      results: { ...result },
    };
  }
  @ApiCreatedResponse({
    description: 'User Profile',
    ...getGenericResponseSchema(Profile),
  })
  @ApiExtraModels(Profile)
  @ApiConflictResponse({ description: 'Unable to delete the profile' })
  @ApiBadRequestResponse({ description: 'Bad request' })
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth()
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete('/:id')
  async remove(@Param('id') id: string) {
    const result = await this.profileService.remove(+id);
    return {
      message: 'User Profile deleted successfully',
      result: result,
    };
  }
}
