import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import * as jwt from 'jsonwebtoken';
import jwksRsa from 'jwks-rsa';
import { JwtPayload } from 'jsonwebtoken';

export interface VerifiedSocialUser {
  email: string;
  socialProviderId: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  provider: 'google' | 'apple';
}

@Injectable()
export class SocialAuthService {
  private googleClient: OAuth2Client;
  private appleSigningKey: jwksRsa.JwksClient;

  constructor(private readonly configService: ConfigService) {
    const googleClientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const appleClientId = this.configService.get<string>('APPLE_CLIENT_ID');

    if (!googleClientId || !appleClientId) {
      throw new Error(
        'Las claves GOOGLE_CLIENT_ID o APPLE_CLIENT_ID no están configuradas.',
      );
    }

    this.googleClient = new OAuth2Client(googleClientId);

    this.appleSigningKey = jwksRsa({
      cache: true,
      rateLimit: true,
      jwksUri: 'https://appleid.apple.com/auth/keys',
    });
  }

  async validateGoogleIdToken(idToken: string): Promise<VerifiedSocialUser> {
    const googleClientId = this.configService.get<string>('GOOGLE_CLIENT_ID');

    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: googleClientId,
      });
      const payload = ticket.getPayload();

      if (
        !payload ||
        !payload.email_verified ||
        !payload.email ||
        !payload.sub
      ) {
        throw new UnauthorizedException(
          'Token de Google inválido, no verificado o sin datos clave.',
        );
      }

      return {
        email: payload.email,
        socialProviderId: payload.sub,
        firstName: payload.given_name,
        lastName: payload.family_name,
        avatarUrl: payload.picture,
        provider: 'google',
      };
    } catch (error) {
      throw new UnauthorizedException('Token de Google inválido o expirado.');
    }
  }

  async validateAppleIdToken(idToken: string): Promise<VerifiedSocialUser> {
    const appleClientId = this.configService.get<string>('APPLE_CLIENT_ID');
    const appleIssuer = 'https://appleid.apple.com';

    const decodedToken = jwt.decode(idToken, { complete: true });
    if (!decodedToken || !decodedToken.header.kid) {
      throw new UnauthorizedException(
        'Token de Apple mal formado o sin Key ID.',
      );
    }
    const kid = decodedToken.header.kid;

    const key = await this.appleSigningKey.getSigningKey(kid);
    const publicKey = key.getPublicKey();

    try {
      const payload = jwt.verify(idToken, publicKey, {
        algorithms: ['RS256'],
        audience: appleClientId,
        issuer: appleIssuer,
        ignoreExpiration: false,
      }) as JwtPayload;

      if (!payload || !payload.email || !payload.sub) {
        throw new UnauthorizedException(
          'Token de Apple inválido o sin datos clave.',
        );
      }

      return {
        email: payload.email,
        socialProviderId: payload.sub,
        provider: 'apple',
      };
    } catch (error) {
      throw new UnauthorizedException('Token de Apple inválido o expirado.');
    }
  }
}
