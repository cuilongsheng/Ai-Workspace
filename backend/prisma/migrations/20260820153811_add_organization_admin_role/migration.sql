-- CreateEnum
CREATE TYPE "OrganizationRoleCode" AS ENUM ('ORGANIZATION_ADMIN');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "organizationRole" "OrganizationRoleCode";
