/*
  Warnings:

  - A unique constraint covering the columns `[title]` on the table `LaySummary` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[title]` on the table `NewsItem` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "LaySummary_title_key" ON "LaySummary"("title");

-- CreateIndex
CREATE UNIQUE INDEX "NewsItem_title_key" ON "NewsItem"("title");
