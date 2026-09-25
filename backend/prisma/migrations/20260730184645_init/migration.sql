-- CreateEnum
CREATE TYPE "PlanCabinet" AS ENUM ('ESSAI', 'STANDARD', 'PREMIUM');

-- CreateEnum
CREATE TYPE "StatutCabinet" AS ENUM ('ACTIF', 'SUSPENDU', 'RESILIE');

-- CreateEnum
CREATE TYPE "RoleSuperAdmin" AS ENUM ('SUPER_ADMIN');

-- CreateTable
CREATE TABLE "cabinets" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telephone" TEXT,
    "adresse" TEXT,
    "plan" "PlanCabinet" NOT NULL DEFAULT 'ESSAI',
    "statut" "StatutCabinet" NOT NULL DEFAULT 'ACTIF',
    "schema_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cabinets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "super_admins" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mot_de_passe" TEXT NOT NULL,
    "role" "RoleSuperAdmin" NOT NULL DEFAULT 'SUPER_ADMIN',
    "refresh_token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "super_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "acteur" TEXT NOT NULL,
    "cabinet_id" TEXT,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cabinets_slug_key" ON "cabinets"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "cabinets_email_key" ON "cabinets"("email");

-- CreateIndex
CREATE UNIQUE INDEX "cabinets_schema_name_key" ON "cabinets"("schema_name");

-- CreateIndex
CREATE UNIQUE INDEX "super_admins_email_key" ON "super_admins"("email");

-- CreateIndex
CREATE INDEX "audit_logs_cabinet_id_idx" ON "audit_logs"("cabinet_id");
