-- CreateTable
CREATE TABLE "Council" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "role" TEXT NOT NULL,
    "councilId" TEXT,
    "inspectorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_councilId_fkey" FOREIGN KEY ("councilId") REFERENCES "Council" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "Inspector" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Inspector" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "baseLat" REAL NOT NULL,
    "baseLng" REAL NOT NULL,
    "councilId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Inspector_councilId_fkey" FOREIGN KEY ("councilId") REFERENCES "Council" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BuilderRegistry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "regNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Permit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ref" TEXT NOT NULL,
    "standNumber" TEXT NOT NULL,
    "suburb" TEXT NOT NULL,
    "projectType" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "ownerPhone" TEXT NOT NULL,
    "builderRegNumber" TEXT NOT NULL,
    "builderName" TEXT NOT NULL,
    "builderStatus" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "councilId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Permit_councilId_fkey" FOREIGN KEY ("councilId") REFERENCES "Council" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Stage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "permitId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'LOCKED',
    "bookedFor" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Stage_permitId_fkey" FOREIGN KEY ("permitId") REFERENCES "Permit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reference" TEXT NOT NULL,
    "permitId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "payerPhone" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "paynowReference" TEXT,
    "pollUrl" TEXT,
    "simulated" BOOLEAN NOT NULL DEFAULT true,
    "paidAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_permitId_fkey" FOREIGN KEY ("permitId") REFERENCES "Permit" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Payment_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "Stage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Inspection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "permitId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "inspectorId" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "photoUrl" TEXT NOT NULL,
    "gpsLat" REAL NOT NULL,
    "gpsLng" REAL NOT NULL,
    "signedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Inspection_permitId_fkey" FOREIGN KEY ("permitId") REFERENCES "Permit" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Inspection_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "Stage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Inspection_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "Inspector" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "permitId" TEXT NOT NULL,
    "serial" TEXT NOT NULL,
    "qrToken" TEXT NOT NULL,
    "issuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Certificate_permitId_fkey" FOREIGN KEY ("permitId") REFERENCES "Permit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT,
    "actorRole" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Council_code_key" ON "Council"("code");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_inspectorId_key" ON "User"("inspectorId");

-- CreateIndex
CREATE UNIQUE INDEX "BuilderRegistry_regNumber_key" ON "BuilderRegistry"("regNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Permit_ref_key" ON "Permit"("ref");

-- CreateIndex
CREATE UNIQUE INDEX "Stage_permitId_key_key" ON "Stage"("permitId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_reference_key" ON "Payment"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Inspection_stageId_key" ON "Inspection"("stageId");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_permitId_key" ON "Certificate"("permitId");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_serial_key" ON "Certificate"("serial");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_qrToken_key" ON "Certificate"("qrToken");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
