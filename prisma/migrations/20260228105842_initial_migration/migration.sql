/*
  Warnings:

  - You are about to drop the `knowledge_chunk` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "knowledge_chunk" DROP CONSTRAINT "knowledge_chunk_project_id_fkey";

-- DropForeignKey
ALTER TABLE "knowledge_chunk" DROP CONSTRAINT "knowledge_chunk_project_knowledge_id_fkey";

-- DropTable
DROP TABLE "knowledge_chunk";
