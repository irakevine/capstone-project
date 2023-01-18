import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { omit } from 'lodash';
import { Repository } from 'typeorm';
import { Department } from '../department/entities/department.entity';
import { User } from '../users/entities/user.entity';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Profile } from './entities/profile.entity';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
  ) {}

  async create(user: User, createProfileDto: CreateProfileDto) {
    const department = await this.departmentRepository.findOne({
      where: { id: createProfileDto.department_id },
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }
    const userProfile = this.profileRepository.create({
      ...omit(createProfileDto, ['department_id']),
      department: department,
      user: user,
    });
    const result = await this.profileRepository.save(userProfile);
    return omit(result, ['user']);
  }

  async findAll() {
    const result = await this.profileRepository.find({ relations: ['user'] });
    return {
      result,
    };
  }

  async findOne(role: string, id: number) {
    //return `This action returns a #${id} profile`;

    const profile = await this.profileRepository.findOne({
      where: { id: id },
      relations: ['user'],
    });
    if (!profile) {
      throw new NotFoundException('This user profile does not exist');
    }
    if (role === 'admin') {
      return {
        Profile: omit(profile, [
          'user',
          'isDeleted',
          'createdOn',
          'lastUpdatedOn',
        ]),
        User: {
          id: profile.user.id,
          first_name: profile.user.first_name,
          last_name: profile.user.last_name,
          email: profile.user.email,
          phone_number: profile.user.phone_number,
        },
      };
    } else {
      return {
        Profile: {
          id: profile.id,
          position: profile.position,
          starting_date: profile.starting_date,
          profession: profile.profession,
          salary: profile.salary,
        },
        User: {
          id: profile.user.id,
          first_name: profile.user.first_name,
          last_name: profile.user.last_name,
          email: profile.user.email,
          phone_number: profile.user.phone_number,
        },
      };
    }
  }

  async update(id: number, updateProfileDto: UpdateProfileDto) {
    //return `This action updates a #${id} profile`;
    const userProfile = await this.profileRepository.findOne({ id: id });
    const department = await this.departmentRepository.findOne({
      where: { id: updateProfileDto.department_id },
    });
    if (!userProfile) {
      throw new ConflictException(
        'The Profile you want to update does not exist',
      );
    }
    if (!department) {
      throw new ConflictException(
        'The department you are adding does not exist',
      );
    }
    return await this.profileRepository.update(
      { id: id },
      { ...omit(updateProfileDto, ['department_id']), department: department },
    );
  }

  async remove(id: number) {
    //return `This action removes a #${id} profile`;
    const profile = await this.profileRepository.findOne({ id: id });
    if (!profile) {
      throw new ConflictException('Profile does not exit');
    }
    return this.profileRepository.delete(profile.id);
  }
}
