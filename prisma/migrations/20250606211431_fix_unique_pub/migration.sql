/*
  Warnings:

  - A unique constraint covering the columns `[title,authors,year,category]` on the table `Publication` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Publication_title_authors_year_category_key" ON "Publication"("title", "authors", "year", "category");
