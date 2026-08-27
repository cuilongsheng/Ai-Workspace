import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MinLength,
} from 'class-validator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUser } from '../auth/types/auth-user';
import { OrganizationAdminService } from './organization-admin.service';

class DepartmentDto {
  @ApiProperty({ example: 'Engineering', minLength: 1, maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @Length(1, 120)
  name: string;

  @ApiPropertyOptional({ example: 'Engineering', minLength: 1, maxLength: 120 })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  nameEn?: string;
}

class CreateEmployeeDto {
  @ApiProperty({ example: 'employee@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: 'Alice' })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  username?: string;

  @ApiProperty({ example: '123456', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  organizationAdmin?: boolean;

  @ApiPropertyOptional({ example: 'department_xxx' })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ example: ['role_xxx'], type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsString({ each: true })
  roleIds?: string[];
}

class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  @Length(1, 80)
  username?: string;

  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE', 'LOCKED'])
  status?: 'ACTIVE' | 'INACTIVE' | 'LOCKED';

  @IsOptional()
  @IsBoolean()
  organizationAdmin?: boolean;
}

class MembershipAssignmentDto {
  @ApiProperty({ example: 'user_xxx' })
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @ApiProperty({ example: ['role_xxx'], type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsString({ each: true })
  roleIds: string[];
}

@ApiTags('Organization Administration')
@ApiBearerAuth('bearerAuth')
@Controller('organization-admin')
@UseGuards(JwtAuthGuard)
export class OrganizationAdminController {
  constructor(private readonly service: OrganizationAdminService) {}

  @Get('departments')
  departments(@CurrentUser() user: AuthUser) {
    return this.service.departments(user.id);
  }

  @Post('departments')
  createDepartment(@CurrentUser() user: AuthUser, @Body() dto: DepartmentDto) {
    return this.service.createDepartment(user.id, dto.name, dto.nameEn);
  }

  @Patch('departments/:departmentId')
  updateDepartment(
    @CurrentUser() user: AuthUser,
    @Param('departmentId') departmentId: string,
    @Body() dto: DepartmentDto,
  ) {
    return this.service.updateDepartment(
      user.id,
      departmentId,
      dto.name,
      dto.nameEn,
    );
  }

  @Get('employees')
  employees(@CurrentUser() user: AuthUser, @Query('search') search?: string) {
    return this.service.employees(user.id, search);
  }

  @Post('employees')
  createEmployee(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateEmployeeDto,
  ) {
    return this.service.createEmployee(
      user.id,
      dto.email,
      dto.username,
      dto.password,
      dto.organizationAdmin,
      dto.departmentId,
      dto.roleIds,
    );
  }

  @Patch('employees/:employeeId')
  updateEmployee(
    @CurrentUser() user: AuthUser,
    @Param('employeeId') employeeId: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.service.updateEmployee(user.id, employeeId, dto);
  }

  @Delete('employees/:employeeId')
  removeEmployee(
    @CurrentUser() user: AuthUser,
    @Param('employeeId') employeeId: string,
  ) {
    return this.service.removeEmployee(user.id, employeeId);
  }

  @Get('roles')
  roles(@CurrentUser() user: AuthUser) {
    return this.service.roles(user.id);
  }

  @Get('departments/:departmentId/members')
  members(
    @CurrentUser() user: AuthUser,
    @Param('departmentId') departmentId: string,
  ) {
    return this.service.members(user.id, departmentId);
  }

  @Get('departments/:departmentId/employee-options')
  employeeOptions(
    @CurrentUser() user: AuthUser,
    @Param('departmentId') departmentId: string,
    @Query('search') search?: string,
  ) {
    return this.service.employeeOptions(user.id, departmentId, search);
  }

  @Post('departments/:departmentId/members')
  assignMember(
    @CurrentUser() user: AuthUser,
    @Param('departmentId') departmentId: string,
    @Body() dto: MembershipAssignmentDto,
  ) {
    return this.service.assignMember(
      user.id,
      departmentId,
      dto.employeeId,
      dto.roleIds,
    );
  }

  @Patch('departments/:departmentId/members/:membershipId')
  updateMember(
    @CurrentUser() user: AuthUser,
    @Param('departmentId') departmentId: string,
    @Param('membershipId') membershipId: string,
    @Body() dto: MembershipAssignmentDto,
  ) {
    return this.service.updateMember(
      user.id,
      departmentId,
      membershipId,
      dto.employeeId,
      dto.roleIds,
    );
  }

  @Delete('departments/:departmentId/members/:membershipId')
  removeMember(
    @CurrentUser() user: AuthUser,
    @Param('departmentId') departmentId: string,
    @Param('membershipId') membershipId: string,
  ) {
    return this.service.removeMember(user.id, departmentId, membershipId);
  }
}
