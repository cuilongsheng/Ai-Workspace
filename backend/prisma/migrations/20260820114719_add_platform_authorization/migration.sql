-- CreateEnum
CREATE TYPE "PlatformRoleCode" AS ENUM ('PLATFORM_ADMIN');

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_organizationId_fkey";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "organizationId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "PlatformRole" (
    "id" TEXT NOT NULL,
    "code" "PlatformRoleCode" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformRoleAssignment" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformRoleAssignment_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "PlatformRolePermission" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "PlatformRolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformRole_code_key" ON "PlatformRole"("code");

-- CreateIndex
CREATE INDEX "PlatformRoleAssignment_roleId_idx" ON "PlatformRoleAssignment"("roleId");

-- CreateIndex
CREATE INDEX "PlatformRolePermission_permissionId_idx" ON "PlatformRolePermission"("permissionId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformRoleAssignment" ADD CONSTRAINT "PlatformRoleAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformRoleAssignment" ADD CONSTRAINT "PlatformRoleAssignment_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "PlatformRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformRolePermission" ADD CONSTRAINT "PlatformRolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "PlatformRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformRolePermission" ADD CONSTRAINT "PlatformRolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
