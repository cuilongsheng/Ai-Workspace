import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { UsersService } from './users.service';
import { ApiExcludeController } from '@nestjs/swagger';

@Controller('users')
@ApiExcludeController()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id/context')
  async getUserContext(@Param('id') userId: string) {
    const user = await this.usersService.getUserContext(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
