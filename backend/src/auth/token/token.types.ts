export interface AccessTokenPayload {
  sub: string; // 就是用户 ID
  sid: string;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  sid: string;
  type: 'refresh';
}

export interface IssuedAccessToken {
  accessToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}
export interface IssuedRefreshToken {
  refreshToken: string;
  expiresIn: number;
}
