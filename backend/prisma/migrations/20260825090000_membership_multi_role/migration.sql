-- A department membership is the employee-to-department relationship.
-- Roles are assignments on that relationship so one employee can be both
-- DEPARTMENT_ADMIN and DEPARTMENT_MEMBER in the same department.
CREATE TABLE "MembershipRole" (
    "membershipId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembershipRole_pkey" PRIMARY KEY ("membershipId", "roleId")
);

INSERT INTO "MembershipRole" ("membershipId", "roleId")
SELECT "id", "roleId" FROM "Membership";

CREATE INDEX "MembershipRole_roleId_idx" ON "MembershipRole"("roleId");

ALTER TABLE "MembershipRole"
ADD CONSTRAINT "MembershipRole_membershipId_fkey"
FOREIGN KEY ("membershipId") REFERENCES "Membership"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MembershipRole"
ADD CONSTRAINT "MembershipRole_roleId_fkey"
FOREIGN KEY ("roleId") REFERENCES "Role"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Membership" DROP CONSTRAINT IF EXISTS "Membership_roleId_fkey";
ALTER TABLE "Membership" DROP COLUMN "roleId";
