-- Companies and schools: organizations, their members, seat packs (corporate orders) and seat assignments.
-- Seat-pack tax invoices are issued to the organization, so a tax document's user becomes optional.

ALTER TYPE "SubscriptionProvider" ADD VALUE 'ORGANIZATION';

CREATE TYPE "OrganizationRole" AS ENUM ('LEARNER', 'MANAGER');
CREATE TYPE "SeatPackStatus" AS ENUM ('INVOICED', 'PAID', 'CANCELLED');
CREATE TYPE "SeatAssignmentStatus" AS ENUM ('ACTIVE', 'REVOKED');

CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "trn" TEXT,
    "address" TEXT,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "billingEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrganizationMember" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "OrganizationRole" NOT NULL DEFAULT 'LEARNER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OrganizationMember_organizationId_userId_key" ON "OrganizationMember"("organizationId", "userId");
CREATE INDEX "OrganizationMember_userId_idx" ON "OrganizationMember"("userId");
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SeatPack" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "batchId" TEXT,
    "courseId" TEXT,
    "seats" INTEGER NOT NULL,
    "unitPriceFils" INTEGER NOT NULL,
    "subtotalFils" INTEGER NOT NULL,
    "discountFils" INTEGER NOT NULL DEFAULT 0,
    "vatFils" INTEGER NOT NULL,
    "totalFils" INTEGER NOT NULL,
    "refundedFils" INTEGER NOT NULL DEFAULT 0,
    "status" "SeatPackStatus" NOT NULL,
    "paymentReference" TEXT,
    "paidAt" TIMESTAMP(3),
    "invoicedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accessEndsAt" TIMESTAMP(3),
    "note" TEXT,
    "createdById" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SeatPack_pkey" PRIMARY KEY ("id"),
    -- exactly one of a batch (live) or a recorded course
    CONSTRAINT "SeatPack_target_check" CHECK (("batchId" IS NULL) <> ("courseId" IS NULL)),
    CONSTRAINT "SeatPack_seats_check" CHECK ("seats" > 0)
);
CREATE UNIQUE INDEX "SeatPack_reference_key" ON "SeatPack"("reference");
CREATE INDEX "SeatPack_organizationId_createdAt_idx" ON "SeatPack"("organizationId", "createdAt");
CREATE INDEX "SeatPack_batchId_status_idx" ON "SeatPack"("batchId", "status");
ALTER TABLE "SeatPack" ADD CONSTRAINT "SeatPack_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SeatPack" ADD CONSTRAINT "SeatPack_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SeatPack" ADD CONSTRAINT "SeatPack_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SeatPack" ADD CONSTRAINT "SeatPack_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "SeatAssignment" (
    "id" TEXT NOT NULL,
    "seatPackId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enrollmentId" TEXT,
    "subscriptionId" TEXT,
    "status" "SeatAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "assignedById" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokedById" TEXT,
    CONSTRAINT "SeatAssignment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SeatAssignment_subscriptionId_key" ON "SeatAssignment"("subscriptionId");
CREATE INDEX "SeatAssignment_seatPackId_status_idx" ON "SeatAssignment"("seatPackId", "status");
CREATE INDEX "SeatAssignment_userId_idx" ON "SeatAssignment"("userId");
-- one live seat per learner per pack (revoked rows are history)
CREATE UNIQUE INDEX "SeatAssignment_active_learner_key" ON "SeatAssignment"("seatPackId", "userId") WHERE "status" = 'ACTIVE';
ALTER TABLE "SeatAssignment" ADD CONSTRAINT "SeatAssignment_seatPackId_fkey" FOREIGN KEY ("seatPackId") REFERENCES "SeatPack"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SeatAssignment" ADD CONSTRAINT "SeatAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SeatAssignment" ADD CONSTRAINT "SeatAssignment_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SeatAssignment" ADD CONSTRAINT "SeatAssignment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seat-pack invoices: buyer is the organization (snapshot in "buyer"), no learner.
ALTER TABLE "TaxDocument" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "TaxDocument" ADD COLUMN "seatPackId" TEXT;
CREATE INDEX "TaxDocument_seatPackId_idx" ON "TaxDocument"("seatPackId");
ALTER TABLE "TaxDocument" ADD CONSTRAINT "TaxDocument_seatPackId_fkey" FOREIGN KEY ("seatPackId") REFERENCES "SeatPack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
