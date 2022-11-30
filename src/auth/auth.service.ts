import {
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { SendGrindService } from '../notifications/sendgrid.service';
import { Connection } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { BcryptService } from '../shared/util/bcrypt.service';
import { ConfigService } from '@nestjs/config';
import { SmsService } from '../notifications/sms.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { omit } from 'lodash';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly sendGridService: SendGrindService,
    private readonly connection: Connection,
    private readonly smsService: SmsService,
    private readonly configService: ConfigService,
    private readonly bcryptService: BcryptService,
  ) {}

  async registrUser(user: CreateUserDto): Promise<any>{
    user.password = await this.bcryptService.hash(user.password);
    if(! await this.checkUserExisting(user.email)){
      const createdUser = await this.userRepository.save(user)
      return omit(createdUser, ['password', 'gender'])
    }else{
      throw new ConflictException('User already exist.')
    }
  }

  async checkUserExisting(email: string): Promise<boolean>{
    const user = await this.userRepository.findOne({email: email});
    console.log(user)
    if (user) {
      return true
    } else {
      return false
    }
  }
  
  
  async checkIfRefreshTokenMatching(
    refreshToken: string,
    hashedRefreshedToken: string,
  ): Promise<boolean> {
    const isRefreshTokenMatching = await this.bcryptService.compare(
      refreshToken,
      hashedRefreshedToken,
    );
    return isRefreshTokenMatching;
  }
}
