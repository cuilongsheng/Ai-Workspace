ALTER TABLE "Department" ADD COLUMN "nameEn" TEXT;

UPDATE "Department"
SET "nameEn" = CASE
  WHEN "name" = '技术部' THEN 'Technology Department'
  WHEN "name" = 'AI创新组' THEN 'AI Innovation Group'
  ELSE "nameEn"
END;
