import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { omit } from 'lodash';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { Department } from './entities/department.entity';

@Injectable()
export class DepartmentService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  create(createDepartmentDto: CreateDepartmentDto);
  async create(createDepartmentDto: CreateDepartmentDto) {
    const hod = await this.userRepository.findOne({
      where: { id: createDepartmentDto.hod },
    });
    const department = this.departmentRepository.create({
      ...omit(createDepartmentDto, ['hod']),
      hod: hod ? hod : null,
    });
    const result = await this.departmentRepository.save(department);
    return {
      result,
    };
  }

  async findAll() {
    const result = await this.departmentRepository.find({ relations: ['hod'] });
    return {
      result,
    };
  }

  async findOne(id: number) {
    //return `This action returns a #${id} profile`;
    const department = await this.departmentRepository.findOne({
      where: { id: id },
    });
    if (!department) {
      throw new NotFoundException('This department does not exist');
    }
    return {
      Department: omit(department, ['isDeleted', 'createdOn', 'lastUpdatedOn']),
    };
  }

  async update(id: number, updateDepartmentDto: UpdateDepartmentDto) {
    const department = await this.departmentRepository.findOne({
      where: { id: id },
    });
    if (!department) {
      throw new NotFoundException('Department not found');
    }
    let hod;
    if (updateDepartmentDto?.hod) {
      hod = await this.userRepository.findOne({
        where: { id: updateDepartmentDto.hod },
      });
    }
    if (!hod) {
      throw new NotFoundException(
        'This hod does not exist as a registered user',
      );
    }
    return await this.departmentRepository.update(
      { id: department.id },
      {
        department_name: updateDepartmentDto.department_name,
        hod: hod ? hod : null,
      },
    );
  }

  async remove(id: number) {
    //return `This action removes a #${id} profile`;
    const profile = await this.departmentRepository.findOne({ id: id });
    if (!profile) {
      throw new ConflictException('Department does not exit');
    }
    return this.departmentRepository.delete(profile.id);
  }
}
