import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateDepartmentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  department_name: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  hod: number;
}
