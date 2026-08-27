export abstract class PasswordHasher {
  abstract hash(plain: string): Promise<string>;

  abstract verify(hash: string, plain: string): Promise<boolean>;
}
