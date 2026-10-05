ALTER TABLE "AlumniProfile"
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "linkedInUrl" TEXT,
  ADD COLUMN "websiteUrl" TEXT;

ALTER TABLE "SchoolAttendance"
  ALTER COLUMN "entryYear" DROP NOT NULL,
  ALTER COLUMN "leavingYear" DROP NOT NULL,
  ADD COLUMN "studentNumber" TEXT;

ALTER TABLE "PrivacySetting"
  ALTER COLUMN "visibility" SET DEFAULT 'MEMBERS_ONLY';

CREATE INDEX "User_schoolId_isActive_surname_firstName_idx"
  ON "User"("schoolId", "isActive", "surname", "firstName");
