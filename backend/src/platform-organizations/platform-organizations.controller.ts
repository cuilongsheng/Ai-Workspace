import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MinLength,
} from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePlatformPermission } from '../access-control/decorators/require-platform-permission.decorator';
import { PlatformPermissionGuard } from '../access-control/guards/platform-permission.guard';
import { PlatformOrganizationsService } from './platform-organizations.service';

class UpdateOrganizationDto {
  @IsString() @IsNotEmpty() @Length(1, 120) name: string;
}

class CreateOrganizationDto extends UpdateOrganizationDto {
  @IsEmail() administratorEmail: string;
  @IsString() @IsOptional() @Length(1, 80) administratorName?: string;
  @IsString() @MinLength(6) administratorPassword: string;
}

class CreateOrganizationAdministratorDto {
  @IsEmail() email: string;
  @IsString() @IsOptional() @Length(1, 80) username?: string;
  @IsString() @MinLength(6) password: string;
}

@ApiTags('Platform Organizations')
@ApiBearerAuth('bearerAuth')
@Controller('platform/organizations')
@UseGuards(JwtAuthGuard, PlatformPermissionGuard)
export class PlatformOrganizationsController {
  constructor(private readonly service: PlatformOrganizationsService) {}
  @Get() @RequirePlatformPermission('organization.read') list() {
    return this.service.list();
  }
  @Get(':organizationId') @RequirePlatformPermission('organization.read') get(
    @Param('organizationId') id: string,
  ) {
    return this.service.get(id);
  }
  @Post() @RequirePlatformPermission('organization.create') create(
    @Body() dto: CreateOrganizationDto,
  ) {
    return this.service.create(dto);
  }
  @Patch(':organizationId')
  @RequirePlatformPermission('organization.update')
  update(
    @Param('organizationId') id: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.service.update(id, dto.name);
  }
  @Patch(':organizationId/disable')
  @RequirePlatformPermission('organization.disable')
  disable(@Param('organizationId') id: string) {
    return this.service.disable(id);
  }
  @Patch(':organizationId/enable')
  @RequirePlatformPermission('organization.update')
  enable(@Param('organizationId') id: string) {
    return this.service.enable(id);
  }
  @Post(':organizationId/administrator')
  @RequirePlatformPermission('organization.update')
  createAdministrator(
    @Param('organizationId') id: string,
    @Body() dto: CreateOrganizationAdministratorDto,
  ) {
    return this.service.createAdministrator(id, dto);
  }
}

@ApiTags('Platform Dashboard')
@ApiBearerAuth('bearerAuth')
@Controller('platform/dashboard')
@UseGuards(JwtAuthGuard, PlatformPermissionGuard)
export class PlatformDashboardController {
  constructor(private readonly service: PlatformOrganizationsService) {}

  @Get()
  @RequirePlatformPermission('organization.read')
  getDashboard() {
    return this.service.dashboard();
  }
}
