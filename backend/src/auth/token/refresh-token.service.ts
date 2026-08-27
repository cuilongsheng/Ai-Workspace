import type {
  IssuedRefreshToken,
  RefreshTokenPayload,
} from '../token/token.types';

export abstract class RefreshTokenService {
  abstract issue(
    payload: Omit<RefreshTokenPayload, 'type'>,
  ): Promise<IssuedRefreshToken>;

  abstract verify(token: string): Promise<RefreshTokenPayload>;
}
