import { AccessTokenPayload, IssuedAccessToken } from '../token/token.types';

export abstract class AccessTokenService {
  abstract issue(
    payload: Omit<AccessTokenPayload, 'type'>,
  ): Promise<IssuedAccessToken>;
}
