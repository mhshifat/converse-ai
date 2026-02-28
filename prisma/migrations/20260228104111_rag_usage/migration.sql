/*
  Warnings:

  - Made the column `proactive_on_exit_intent` on table `project` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "project" ALTER COLUMN "proactive_on_exit_intent" SET NOT NULL;
