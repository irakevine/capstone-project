import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { omit } from 'lodash';
import {
  IPaginationOptions,
  paginate,
  Pagination,
} from 'nestjs-typeorm-paginate';
import { Repository } from 'typeorm';
import { CandidateSorting } from '../shared/enums/candidate-sort-by.enum';
import { Sorting } from '../shared/enums/sorting.enum';
import { UserRole } from '../shared/enums/user-roles.enum';
import { BcryptService } from '../shared/util/bcrypt.service';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly bcryptService: BcryptService,
  ) {}

  async findAllCandidate(
    options: IPaginationOptions,
    searchQuery: string,
    sortBy: string,
    sortOrder: string,
  ): Promise<Pagination<User>> {
    const queryBuilder = this.userRepository.createQueryBuilder('candidate');
    if (searchQuery) {
      queryBuilder.where('LOWER(candidate.firstName) LIKE :query', {
        query: `%${searchQuery}%`,
      });
      queryBuilder.orWhere('LOWER(candidate.lastName) LIKE :query', {
        query: `%${searchQuery}%`,
      });
      queryBuilder.orWhere('LOWER(candidate.email) LIKE :query', {
        query: `%${searchQuery}%`,
      });
    }
    queryBuilder.andWhere(
      'candidate.role =:role AND candidate.isDeleted =:deleted',
      {
        role: UserRole.CANDIDATE,
        deleted: false,
      },
    );
    queryBuilder.leftJoinAndSelect('candidate.generalInfo', 'generalInfo');
    queryBuilder.leftJoinAndSelect(
      'candidate.drivingLicense',
      'drivingLicense',
    );
    queryBuilder.leftJoinAndSelect('candidate.training', 'training');
    queryBuilder.leftJoinAndSelect('candidate.language', 'language');
    queryBuilder.leftJoinAndSelect('candidate.education', 'education');
    queryBuilder.leftJoinAndSelect(
      'candidate.employmentJourney',
      'employmentJourney',
      'employmentJourney.present= :present',
      { present: true },
    );
    if (sortBy !== undefined || sortBy !== null) {
      if (sortBy === CandidateSorting.NAME) {
        queryBuilder.orderBy(
          'candidate.firstName',
          `${sortOrder === Sorting.DESC ? 'DESC' : 'ASC'}`,
        );
      }
      if (sortBy === CandidateSorting.EMAIL) {
        queryBuilder.orderBy(
          'candidate.email',
          `${sortOrder === Sorting.DESC ? 'DESC' : 'ASC'}`,
        );
      }
      if (sortBy === CandidateSorting.DATE) {
        queryBuilder.orderBy(
          'candidate.createdOn',
          `${sortOrder === Sorting.DESC ? 'DESC' : 'ASC'}`,
        );
      }
    }
    return await paginate<User>(queryBuilder, options);
  }

  async getOneCandidate(id: number): Promise<User> {
    const candidate = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.generalInfo', 'generalInfo')
      .leftJoinAndSelect('user.drivingLicense', 'drivingLicense')
      .leftJoinAndSelect('user.employmentJourney', 'employmentJourney')
      .leftJoinAndSelect('user.language', 'language')
      .leftJoinAndSelect('language.name', 'name')
      .leftJoinAndSelect('user.training', 'training')
      .leftJoinAndSelect('user.education', 'education')
      .leftJoinAndSelect('education.level', 'level')
      .leftJoinAndSelect('education.fieldOfStudy', 'fieldOfStudy')
      .where('user.id =:userId', { userId: id })
      .andWhere('user.role =:role', { role: UserRole.CANDIDATE })
      .andWhere('user.isDeleted =:isDeleted', { isDeleted: false })
      .getOne();
    if (!candidate) {
      throw new NotFoundException('Not Found');
    }
    return omit(candidate, ['currentHashedRefreshToken', 'password']);
  }

  async deleteCandidate(id: number): Promise<void> {
    const candidate = await this.userRepository.findOne({ id: id });
    if (!candidate) {
      throw new NotFoundException('Not Found');
    }
    candidate.email = await this.bcryptService.hash(candidate.email);
    candidate.phoneNumber = await this.bcryptService.hash(
      candidate.phoneNumber,
    );
    candidate.isDeleted = true;
    await this.userRepository.save(candidate);
  }
}
