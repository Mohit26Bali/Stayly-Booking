export type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "REFUNDED" | "EXPIRED";
export type PaymentStatus = "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED" | "PARTIALLY_REFUNDED";

export interface BookingHotelSummary {
  id: string;
  name: string;
  slug: string;
  city: string;
  country: string;
  images: { id: string; url: string; altText: string | null }[];
}

export interface BookingRoomSummary {
  id: string;
  name: string;
  pricePerNight: string;
}

export interface Payment {
  id: string;
  provider: "STRIPE" | "RAZORPAY";
  status: PaymentStatus;
  amount: string;
}

export interface BookingGuest {
  id: string;
  fullName: string;
  age: number | null;
}

export interface Booking {
  id: string;
  bookingRef: string;
  checkIn: string;
  checkOut: string;
  guestsCount: number;
  unitsBooked: number;
  status: BookingStatus;
  subtotal: string;
  taxAmount: string;
  discountAmount: string;
  totalAmount: string;
  currency: string;
  specialRequests: string | null;
  createdAt: string;
  hotel: BookingHotelSummary;
  room: BookingRoomSummary;
  payments?: Payment[];
  guests?: BookingGuest[];
}

export interface RazorpayOrderInfo {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  hotelName: string;
  roomName: string;
}

export interface CreateBookingResponse {
  booking: Booking;
  checkoutUrl: string | null;
  demoMode: boolean;
  razorpay: RazorpayOrderInfo | null;
}
