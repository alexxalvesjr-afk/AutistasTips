-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "previousTokenHash" TEXT,
ADD COLUMN     "rotatedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "sessions_previousTokenHash_key" ON "sessions"("previousTokenHash");

