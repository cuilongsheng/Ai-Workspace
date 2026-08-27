import { UsersService } from './users.service';

describe('UsersService login lookup', () => {
  it('matches a normalized account by email or username', async () => {
    const prisma = {
      user: { findFirst: jest.fn().mockResolvedValue({ id: 'user-1' }) },
    };
    const service = new UsersService(prisma as never);

    await service.findByLogin('  AdMiN  ');

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        OR: [
          { email: 'admin' },
          { username: { equals: 'admin', mode: 'insensitive' } },
        ],
      },
    });
  });
});
