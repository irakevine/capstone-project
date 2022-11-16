import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { VerifyBy } from '../../shared/enums/verify-by.enum';
import { Gender } from './../../shared/enums/gender.enum';

export class CreateUserDto {
  @ApiProperty()
  @IsEmail()
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Matches(/^(?=.*[\d])(?=.*[a-z])(?=.*[A-Z]).{8,16}$/, {
    message: 'Password is weak',
  })
  password: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEnum(Gender, {
    message: `gender value can either be 'm' for male or 'f' for female`,
  })
  gender: Gender;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MinLength(13)
  phoneNumber: string;

  @ApiProperty()
  @IsEnum(VerifyBy)
  @IsNotEmpty()
  verifyBy: VerifyBy;

  @ApiProperty({ default: false })
  @IsBoolean()
  @IsNotEmpty()
  agreed: boolean;
}
