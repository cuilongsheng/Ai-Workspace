import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDepartmentById(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      select: {
        id: true,
        organizationId: true,
      },
    });
    if (!department) {
      throw new NotFoundException('Department not found');
    }
    return department;
  }
}
