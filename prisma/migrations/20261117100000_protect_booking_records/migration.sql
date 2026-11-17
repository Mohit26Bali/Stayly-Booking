-- Protect booking and payment records.
--
-- Before: deleting a hotel or a room cascaded to every booking of it, and from there to its payments,
-- transactions and reviews - an owner deleting a room silently erased guests' paid reservations.
-- After: the database refuses to delete a hotel or room that still has bookings (the application turns that
-- into a clear message and suggests making the room unavailable / suspending the hotel instead).

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_hotelId_fkey";

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_roomId_fkey";

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
