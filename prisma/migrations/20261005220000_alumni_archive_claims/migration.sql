-- CreateEnum
CREATE TYPE "ArchiveRecordStatus" AS ENUM ('LIVING', 'DECEASED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "AlumniClaimStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "AlumniImportBatch" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "sourceFilename" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "totalRows" INTEGER NOT NULL,
    "importedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "duplicateCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlumniImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlumniArchiveRecord" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "importBatchId" TEXT,
    "sourceRowNumber" INTEGER,
    "fullName" TEXT NOT NULL,
    "firstName" TEXT,
    "middleName" TEXT,
    "surname" TEXT,
    "title" TEXT,
    "setYear" INTEGER NOT NULL,
    "cohortId" TEXT,
    "house" TEXT,
    "profession" TEXT,
    "status" "ArchiveRecordStatus" NOT NULL DEFAULT 'LIVING',
    "email" TEXT,
    "phone" TEXT,
    "remarks" TEXT,
    "biography" TEXT,
    "photoUrl" TEXT,
    "claimedByUserId" TEXT,
    "claimedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlumniArchiveRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlumniProfileClaim" (
    "id" TEXT NOT NULL,
    "archiveRecordId" TEXT NOT NULL,
    "claimantUserId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "status" "AlumniClaimStatus" NOT NULL DEFAULT 'PENDING',
    "claimantMessage" TEXT,
    "reviewerUserId" TEXT,
    "reviewerMessage" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlumniProfileClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AlumniImportBatch_schoolId_createdAt_idx" ON "AlumniImportBatch"("schoolId", "createdAt");

-- CreateIndex
CREATE INDEX "AlumniImportBatch_uploadedById_idx" ON "AlumniImportBatch"("uploadedById");

-- CreateIndex
CREATE UNIQUE INDEX "AlumniImportBatch_schoolId_contentHash_key" ON "AlumniImportBatch"("schoolId", "contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "AlumniArchiveRecord_claimedByUserId_key" ON "AlumniArchiveRecord"("claimedByUserId");

-- CreateIndex
CREATE INDEX "AlumniArchiveRecord_schoolId_setYear_archivedAt_idx" ON "AlumniArchiveRecord"("schoolId", "setYear", "archivedAt");

-- CreateIndex
CREATE INDEX "AlumniArchiveRecord_schoolId_fullName_idx" ON "AlumniArchiveRecord"("schoolId", "fullName");

-- CreateIndex
CREATE INDEX "AlumniArchiveRecord_schoolId_status_idx" ON "AlumniArchiveRecord"("schoolId", "status");

-- CreateIndex
CREATE INDEX "AlumniArchiveRecord_cohortId_idx" ON "AlumniArchiveRecord"("cohortId");

-- CreateIndex
CREATE UNIQUE INDEX "AlumniArchiveRecord_importBatchId_sourceRowNumber_key" ON "AlumniArchiveRecord"("importBatchId", "sourceRowNumber");

-- CreateIndex
CREATE INDEX "AlumniProfileClaim_schoolId_status_createdAt_idx" ON "AlumniProfileClaim"("schoolId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "AlumniProfileClaim_archiveRecordId_status_idx" ON "AlumniProfileClaim"("archiveRecordId", "status");

-- CreateIndex
CREATE INDEX "AlumniProfileClaim_claimantUserId_status_idx" ON "AlumniProfileClaim"("claimantUserId", "status");

-- AddForeignKey
ALTER TABLE "AlumniImportBatch" ADD CONSTRAINT "AlumniImportBatch_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlumniImportBatch" ADD CONSTRAINT "AlumniImportBatch_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlumniArchiveRecord" ADD CONSTRAINT "AlumniArchiveRecord_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlumniArchiveRecord" ADD CONSTRAINT "AlumniArchiveRecord_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "AlumniImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlumniArchiveRecord" ADD CONSTRAINT "AlumniArchiveRecord_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlumniArchiveRecord" ADD CONSTRAINT "AlumniArchiveRecord_claimedByUserId_fkey" FOREIGN KEY ("claimedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlumniProfileClaim" ADD CONSTRAINT "AlumniProfileClaim_archiveRecordId_fkey" FOREIGN KEY ("archiveRecordId") REFERENCES "AlumniArchiveRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlumniProfileClaim" ADD CONSTRAINT "AlumniProfileClaim_claimantUserId_fkey" FOREIGN KEY ("claimantUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlumniProfileClaim" ADD CONSTRAINT "AlumniProfileClaim_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlumniProfileClaim" ADD CONSTRAINT "AlumniProfileClaim_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

