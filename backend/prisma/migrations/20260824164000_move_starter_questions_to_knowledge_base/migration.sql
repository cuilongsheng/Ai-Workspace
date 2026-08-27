ALTER TABLE "KnowledgeBase"
ADD COLUMN "starterQuestions" JSONB NOT NULL DEFAULT '[]';

UPDATE "KnowledgeBase" AS knowledge_base
SET "starterQuestions" = CASE
  WHEN jsonb_typeof(department."starterQuestions" -> 'zh-CN') = 'array'
    AND jsonb_array_length(department."starterQuestions" -> 'zh-CN') > 0
    THEN department."starterQuestions" -> 'zh-CN'
  WHEN jsonb_typeof(department."starterQuestions" -> 'en-US') = 'array'
    THEN department."starterQuestions" -> 'en-US'
  ELSE '[]'::jsonb
END
FROM "Department" AS department
WHERE department."id" = knowledge_base."departmentId";

ALTER TABLE "Department"
DROP COLUMN "starterQuestions";
