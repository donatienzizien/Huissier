import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

// Stratégie dédiée au portail client, avec un secret DIFFÉRENT de celui du
// personnel (JWT_ACCESS_SECRET). Un jeton client ne peut donc jamais
// authentifier une route réservée au personnel, et vice-versa — même en
// cas d'erreur de code futur sur une route.
@Injectable()
export class JwtPortailStrategy extends PassportStrategy(Strategy, 'jwt-portail') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_PORTAIL_ACCESS_SECRET,
    });
  }

  async validate(payload: any) {
    return payload;
  }
}