import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService], // 为了让 AuthService 能使用 UsersService
})
export class UsersModule {}
