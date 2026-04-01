/*
  Warnings:

  - You are about to drop the column `isDeleted` on the `LaySummary` table. All the data in the column will be lost.
  - You are about to drop the column `isDeleted` on the `NewsItem` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LaySummary" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "paperlink" TEXT NOT NULL,
    "figureLink" TEXT NOT NULL,
    "figCaption" TEXT NOT NULL,
    "section1" TEXT NOT NULL,
    "section2" TEXT NOT NULL,
    "section3" TEXT NOT NULL,
    "section4" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_LaySummary" ("createdAt", "description", "figCaption", "figureLink", "id", "paperlink", "section1", "section2", "section3", "section4", "title") SELECT "createdAt", "description", "figCaption", "figureLink", "id", "paperlink", "section1", "section2", "section3", "section4", "title" FROM "LaySummary";
DROP TABLE "LaySummary";
ALTER TABLE "new_LaySummary" RENAME TO "LaySummary";
CREATE UNIQUE INDEX "LaySummary_title_key" ON "LaySummary"("title");
CREATE TABLE "new_NewsItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "figureLink" TEXT NOT NULL,
    "figCaption" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_NewsItem" ("body", "category", "createdAt", "description", "figCaption", "figureLink", "id", "title") SELECT "body", "category", "createdAt", "description", "figCaption", "figureLink", "id", "title" FROM "NewsItem";
DROP TABLE "NewsItem";
ALTER TABLE "new_NewsItem" RENAME TO "NewsItem";
CREATE UNIQUE INDEX "NewsItem_title_key" ON "NewsItem"("title");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
