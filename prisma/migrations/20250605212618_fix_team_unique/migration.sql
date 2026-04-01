/*
  Warnings:

  - A unique constraint covering the columns `[name,title]` on the table `TeamMember` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_name_title_key" ON "TeamMember"("name", "title");
