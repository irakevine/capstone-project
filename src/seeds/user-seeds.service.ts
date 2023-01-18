import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { BcryptService } from '../shared/util/bcrypt.service';
import { UserRole } from '../shared/enums/user-roles.enum';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserSeedService {
  constructor(
    private readonly entityManager: EntityManager,
    private bcryptService: BcryptService,
    public configService: ConfigService,
  ) {}

  async seed(): Promise<void> {
    const adminExist = await this.entityManager.findOne(User, {
      email: this.configService.get('ADMIN_EMAIL'),
    });
    if (!adminExist) {
      const user = new User();
      user.first_name = this.configService.get('ADMIN_FNAME');
      user.last_name = this.configService.get('ADMIN_LNAME');
      user.email = this.configService.get('ADMIN_EMAIL');
      user.password = await this.bcryptService.hash(
        this.configService.get('ADMIN_PASSWORD'),
      );
      user.phone_number = this.configService.get('ADMIN_PHONE');
      user.role = UserRole.ADMIN;
      user.active = true;
      user.isVerified = true;
      await this.entityManager.save(User, user);
    }
  }
}
