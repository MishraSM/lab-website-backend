/*
  Warnings:

  - A unique constraint covering the columns `[title,jobType]` on the table `Opportunity` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Opportunity_title_jobType_key" ON "Opportunity"("title", "jobType");
