-- CreateEnum
CREATE TYPE "HotelCategory" AS ENUM ('LUXURY_RESORT', 'BOUTIQUE_HOTEL', 'BUSINESS_HOTEL', 'VILLA', 'BUDGET_HOTEL');

-- CreateEnum
CREATE TYPE "BedType" AS ENUM ('SINGLE', 'DOUBLE', 'QUEEN', 'KING', 'TWIN_BEDS', 'BUNK');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentProvider" ADD VALUE 'UPI';
ALTER TYPE "PaymentProvider" ADD VALUE 'CREDIT_CARD';

-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_hotelId_fkey";

-- DropIndex
DROP INDEX "messages_hotelId_idx";

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "adults" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "children" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "coupons" ADD COLUMN     "maxDiscountAmount" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "hotels" ADD COLUMN     "category" "HotelCategory" NOT NULL DEFAULT 'BUSINESS_HOTEL',
ADD COLUMN     "starRating" INTEGER NOT NULL DEFAULT 3;

-- AlterTable
ALTER TABLE "messages" DROP COLUMN "hotelId",
ADD COLUMN     "conversationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "invoiceNumber" TEXT,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "rooms" ADD COLUMN     "bedType" "BedType" NOT NULL DEFAULT 'DOUBLE',
ADD COLUMN     "discountPercent" DECIMAL(5,2),
ADD COLUMN     "floor" INTEGER,
ADD COLUMN     "isAvailable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "roomNumber" TEXT;

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conversations_hotelId_idx" ON "conversations"("hotelId");

-- CreateIndex
CREATE INDEX "conversations_customerId_idx" ON "conversations"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_hotelId_customerId_key" ON "conversations"("hotelId", "customerId");

-- CreateIndex
CREATE INDEX "messages_conversationId_idx" ON "messages"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_invoiceNumber_key" ON "payments"("invoiceNumber");

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

