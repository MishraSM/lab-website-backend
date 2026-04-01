/*
  Warnings:

  - A unique constraint covering the columns `[pubmedId]` on the table `Publication` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Publication" ADD COLUMN "pubmedId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Publication_pubmedId_key" ON "Publication"("pubmedId");
