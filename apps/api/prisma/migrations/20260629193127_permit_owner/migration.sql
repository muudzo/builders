-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Permit" (
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
    "ownerUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Permit_councilId_fkey" FOREIGN KEY ("councilId") REFERENCES "Council" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Permit_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Permit" ("builderName", "builderRegNumber", "builderStatus", "councilId", "createdAt", "id", "ownerName", "ownerPhone", "projectType", "ref", "standNumber", "status", "suburb") SELECT "builderName", "builderRegNumber", "builderStatus", "councilId", "createdAt", "id", "ownerName", "ownerPhone", "projectType", "ref", "standNumber", "status", "suburb" FROM "Permit";
DROP TABLE "Permit";
ALTER TABLE "new_Permit" RENAME TO "Permit";
CREATE UNIQUE INDEX "Permit_ref_key" ON "Permit"("ref");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
