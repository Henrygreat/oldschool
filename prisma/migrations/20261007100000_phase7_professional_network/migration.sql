-- Phase 7: professional network, businesses, opportunities (additive only)
CREATE TYPE "BusinessStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SUSPENDED');
CREATE TYPE "BusinessMemberRole" AS ENUM ('OWNER', 'FOUNDER', 'CO_FOUNDER', 'DIRECTOR', 'PARTNER', 'EMPLOYEE');
CREATE TYPE "OpportunityType" AS ENUM ('JOB', 'CONTRACT', 'INTERNSHIP', 'BUSINESS_OPPORTUNITY', 'PARTNERSHIP', 'VOLUNTEERING', 'MENTORSHIP', 'OTHER');
CREATE TYPE "OpportunityStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'EXPIRED', 'CLOSED', 'SUSPENDED');
CREATE TYPE "WorkMode" AS ENUM ('ON_SITE', 'HYBRID', 'REMOTE');

ALTER TABLE "Report" ADD COLUMN "businessId" TEXT, ADD COLUMN "opportunityId" TEXT;

CREATE TABLE "ProfessionalProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "isListed" BOOLEAN NOT NULL DEFAULT false,
    "openToOpportunities" BOOLEAN NOT NULL DEFAULT false,
    "availableToMentor" BOOLEAN NOT NULL DEFAULT false,
    "lookingForMentor" BOOLEAN NOT NULL DEFAULT false,
    "canHelpWith" TEXT[],
    "needsHelpWith" TEXT[],
    "mentoringAreas" TEXT[],
    "yearsOfExperience" INTEGER,
    "professionalSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProfessionalProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Business" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "description" TEXT,
    "industry" TEXT,
    "services" TEXT[],
    "location" TEXT,
    "country" TEXT,
    "website" TEXT,
    "publicEmail" TEXT,
    "publicPhone" TEXT,
    "linkedInUrl" TEXT,
    "yearEstablished" INTEGER,
    "status" "BusinessStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BusinessMember" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "BusinessMemberRole" NOT NULL DEFAULT 'EMPLOYEE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BusinessMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "postedByUserId" TEXT NOT NULL,
    "businessId" TEXT,
    "type" "OpportunityType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "organisation" TEXT,
    "location" TEXT,
    "country" TEXT,
    "workMode" "WorkMode",
    "employmentType" TEXT,
    "applicationUrl" TEXT,
    "closingDate" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "status" "OpportunityStatus" NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProfessionalProfile_userId_key" ON "ProfessionalProfile"("userId");
CREATE INDEX "ProfessionalProfile_schoolId_isListed_idx" ON "ProfessionalProfile"("schoolId", "isListed");
CREATE INDEX "ProfessionalProfile_schoolId_isListed_availableToMentor_idx" ON "ProfessionalProfile"("schoolId", "isListed", "availableToMentor");
CREATE INDEX "ProfessionalProfile_schoolId_isListed_openToOpportunities_idx" ON "ProfessionalProfile"("schoolId", "isListed", "openToOpportunities");
CREATE UNIQUE INDEX "Business_slug_key" ON "Business"("slug");
CREATE INDEX "Business_schoolId_status_idx" ON "Business"("schoolId", "status");
CREATE INDEX "Business_schoolId_status_name_idx" ON "Business"("schoolId", "status", "name");
CREATE UNIQUE INDEX "BusinessMember_businessId_userId_key" ON "BusinessMember"("businessId", "userId");
CREATE INDEX "BusinessMember_userId_idx" ON "BusinessMember"("userId");
CREATE INDEX "Opportunity_schoolId_status_createdAt_idx" ON "Opportunity"("schoolId", "status", "createdAt");
CREATE INDEX "Opportunity_schoolId_type_status_idx" ON "Opportunity"("schoolId", "type", "status");
CREATE INDEX "Opportunity_postedByUserId_idx" ON "Opportunity"("postedByUserId");
CREATE INDEX "Opportunity_businessId_idx" ON "Opportunity"("businessId");
CREATE INDEX "Report_businessId_status_idx" ON "Report"("businessId", "status");
CREATE INDEX "Report_opportunityId_status_idx" ON "Report"("opportunityId", "status");

ALTER TABLE "ProfessionalProfile" ADD CONSTRAINT "ProfessionalProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Business" ADD CONSTRAINT "Business_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessMember" ADD CONSTRAINT "BusinessMember_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessMember" ADD CONSTRAINT "BusinessMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_postedByUserId_fkey" FOREIGN KEY ("postedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
