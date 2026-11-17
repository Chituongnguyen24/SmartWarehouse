import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user/user.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private config: ConfigService,
    private userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    let user: any = null;
    if (payload.sub) {
      user = await this.userService.findOneById(payload.sub);
    }
    if (!user && payload.email) {
      user = await this.userService.findOneByEmail(payload.email);
    }
    if (!user) {
      throw new UnauthorizedException('Token is invalid or user no longer exists');
    }
    return user;
  }
}
