-- CreateEnum
CREATE TYPE "public"."UserState" AS ENUM ('Activo', 'Inactivo', 'Suspendido', 'Eliminado', 'Asignado');

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('Operador', 'Admin', 'S_A');

-- CreateEnum
CREATE TYPE "public"."TruckState" AS ENUM ('Activo', 'Inactivo', 'Mantenimiento', 'Transito', 'Descarga', 'Asignado');

-- CreateEnum
CREATE TYPE "public"."FuelType" AS ENUM ('DIESEL_B5', 'DIESEL_B500', 'GASOLINA_PREMIUM_95', 'GASOLINA_REGULAR_90', 'GASOHOL_84', 'GASOHOL_90', 'GASOHOL_95', 'SOLVENTE', 'GASOL', 'PERSONALIZADO');

-- CreateEnum
CREATE TYPE "public"."DischargeStatus" AS ENUM ('pendiente', 'en_proceso', 'finalizado', 'cancelado');

-- CreateEnum
CREATE TYPE "public"."TripStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."AssignmentStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" SERIAL NOT NULL,
    "dni" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lastname" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL DEFAULT 'peru2025++',
    "role" "public"."UserRole" NOT NULL DEFAULT 'Operador',
    "state" "public"."UserState" NOT NULL DEFAULT 'Activo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."trucks" (
    "id" SERIAL NOT NULL,
    "placa" TEXT NOT NULL,
    "typefuel" "public"."FuelType" NOT NULL,
    "customFuelType" TEXT,
    "capacitygal" DECIMAL(10,2) NOT NULL,
    "lastRemaining" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "state" "public"."TruckState" NOT NULL DEFAULT 'Activo',
    "model" TEXT,
    "year" INTEGER,
    "notes" TEXT,

    CONSTRAINT "trucks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."customers" (
    "id" SERIAL NOT NULL,
    "companyname" TEXT NOT NULL,
    "ruc" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DECIMAL(65,30),
    "longitude" DECIMAL(65,30),

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."assignments" (
    "id" SERIAL NOT NULL,
    "truckId" INTEGER NOT NULL,
    "driverId" INTEGER NOT NULL,
    "totalLoaded" DECIMAL(65,30) NOT NULL,
    "totalRemaining" DECIMAL(65,30) NOT NULL,
    "fuelType" "public"."FuelType" NOT NULL,
    "customFuelType" TEXT,
    "status" "public"."AssignmentStatus" NOT NULL DEFAULT 'PENDING',
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "tripStartTime" TIMESTAMP(3),
    "tripEndTime" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."discharges" (
    "id" SERIAL NOT NULL,
    "valeNumber" TEXT NOT NULL,
    "assignmentId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "totalDischarged" DECIMAL(65,30) NOT NULL,
    "status" "public"."DischargeStatus" NOT NULL DEFAULT 'pendiente',
    "marcadorInicial" DECIMAL(65,30),
    "marcadorFinal" DECIMAL(65,30),
    "cantidadReal" DECIMAL(65,30),
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "operatorEmail" TEXT,
    "kilometraje" DECIMAL(65,30),
    "ubicacion" TEXT,
    "tipoUnidad" TEXT,
    "observaciones" TEXT,
    "photoUrls" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discharges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ClientAssignment" (
    "id" SERIAL NOT NULL,
    "assignmentId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "allocatedQuantity" DECIMAL(10,2) NOT NULL,
    "deliveredQuantity" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "remainingQuantity" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "marcadorInicial" DECIMAL(10,2),
    "marcadorFinal" DECIMAL(10,2),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."trips" (
    "id" SERIAL NOT NULL,
    "assignmentId" INTEGER NOT NULL,
    "driverId" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "status" "public"."TripStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "route" JSONB,
    "totalDistance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "estimatedTime" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."driver_locations" (
    "id" SERIAL NOT NULL,
    "driverId" INTEGER NOT NULL,
    "latitude" DECIMAL(10,8) NOT NULL,
    "longitude" DECIMAL(10,8) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "tripId" INTEGER,

    CONSTRAINT "driver_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."assignment_images" (
    "id" SERIAL NOT NULL,
    "assignmentId" INTEGER NOT NULL,
    "dispatchId" INTEGER,
    "type" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedBy" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignment_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_dni_key" ON "public"."users"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "trucks_placa_key" ON "public"."trucks"("placa");

-- CreateIndex
CREATE UNIQUE INDEX "customers_companyname_key" ON "public"."customers"("companyname");

-- CreateIndex
CREATE UNIQUE INDEX "customers_ruc_key" ON "public"."customers"("ruc");

-- CreateIndex
CREATE INDEX "assignments_driverId_idx" ON "public"."assignments"("driverId");

-- CreateIndex
CREATE INDEX "assignments_truckId_idx" ON "public"."assignments"("truckId");

-- CreateIndex
CREATE INDEX "assignments_createdAt_idx" ON "public"."assignments"("createdAt");

-- CreateIndex
CREATE INDEX "assignments_fuelType_idx" ON "public"."assignments"("fuelType");

-- CreateIndex
CREATE INDEX "assignments_isCompleted_idx" ON "public"."assignments"("isCompleted");

-- CreateIndex
CREATE INDEX "assignments_status_idx" ON "public"."assignments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "discharges_valeNumber_key" ON "public"."discharges"("valeNumber");

-- CreateIndex
CREATE INDEX "discharges_assignmentId_idx" ON "public"."discharges"("assignmentId");

-- CreateIndex
CREATE INDEX "discharges_customerId_idx" ON "public"."discharges"("customerId");

-- CreateIndex
CREATE INDEX "discharges_status_idx" ON "public"."discharges"("status");

-- CreateIndex
CREATE INDEX "discharges_createdAt_idx" ON "public"."discharges"("createdAt");

-- CreateIndex
CREATE INDEX "discharges_valeNumber_idx" ON "public"."discharges"("valeNumber");

-- CreateIndex
CREATE INDEX "ClientAssignment_assignmentId_idx" ON "public"."ClientAssignment"("assignmentId");

-- CreateIndex
CREATE INDEX "ClientAssignment_customerId_idx" ON "public"."ClientAssignment"("customerId");

-- CreateIndex
CREATE INDEX "ClientAssignment_status_idx" ON "public"."ClientAssignment"("status");

-- CreateIndex
CREATE INDEX "trips_assignmentId_idx" ON "public"."trips"("assignmentId");

-- CreateIndex
CREATE INDEX "trips_driverId_idx" ON "public"."trips"("driverId");

-- CreateIndex
CREATE INDEX "trips_status_idx" ON "public"."trips"("status");

-- CreateIndex
CREATE INDEX "trips_startTime_idx" ON "public"."trips"("startTime");

-- CreateIndex
CREATE INDEX "driver_locations_driverId_timestamp_idx" ON "public"."driver_locations"("driverId", "timestamp");

-- CreateIndex
CREATE INDEX "driver_locations_tripId_idx" ON "public"."driver_locations"("tripId");

-- CreateIndex
CREATE INDEX "assignment_images_assignmentId_idx" ON "public"."assignment_images"("assignmentId");

-- CreateIndex
CREATE INDEX "assignment_images_dispatchId_idx" ON "public"."assignment_images"("dispatchId");

-- CreateIndex
CREATE INDEX "assignment_images_type_idx" ON "public"."assignment_images"("type");

-- CreateIndex
CREATE INDEX "assignment_images_uploadedBy_idx" ON "public"."assignment_images"("uploadedBy");

-- CreateIndex
CREATE INDEX "assignment_images_createdAt_idx" ON "public"."assignment_images"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."assignments" ADD CONSTRAINT "assignments_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "public"."trucks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assignments" ADD CONSTRAINT "assignments_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."discharges" ADD CONSTRAINT "discharges_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "public"."assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."discharges" ADD CONSTRAINT "discharges_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ClientAssignment" ADD CONSTRAINT "ClientAssignment_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "public"."assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ClientAssignment" ADD CONSTRAINT "ClientAssignment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."trips" ADD CONSTRAINT "trips_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "public"."assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."trips" ADD CONSTRAINT "trips_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."driver_locations" ADD CONSTRAINT "driver_locations_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."driver_locations" ADD CONSTRAINT "driver_locations_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "public"."trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assignment_images" ADD CONSTRAINT "assignment_images_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "public"."assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assignment_images" ADD CONSTRAINT "assignment_images_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
