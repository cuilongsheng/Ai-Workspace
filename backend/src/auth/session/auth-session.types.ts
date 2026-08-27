export interface AuthSession {
  userId: string;
  tokenHash: string;
  createdAt: string;
  lastRotatedAt: string;
}
