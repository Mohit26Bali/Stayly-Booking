"use client";

import { use, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { differenceInCalendarDays, format } from "date-fns";
import { isAxiosError } from "axios";
import { Loader2, ShieldCheck, Tag, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { formatINR } from "@/lib/format";
import { loadRazorpayScript } from "@/lib/load-razorpay";
import { useRoomDetail } from "@/features/bookings/hooks/use-room";
import { useCreateBooking, useVerifyRazorpayPayment } from "@/features/bookings/hooks/use-bookings";
import { useValidateCoupon } from "@/features/bookings/hooks/use-coupon";
import { useAuthStore } from "@/features/auth/store";
import type { RazorpayOrderInfo } from "@/types/booking";

export default function CheckoutPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const checkIn = searchParams.get("checkIn") ?? format(new Date(), "yyyy-MM-dd");
  const checkOut = searchParams.get("checkOut") ?? format(new Date(), "yyyy-MM-dd");
  const guestsCount = Number(searchParams.get("guests") ?? "1");

  const { data: room, isLoading } = useRoomDetail(roomId);
  const createBooking = useCreateBooking();
  const verifyPayment = useVerifyRazorpayPayment();
  const validateCoupon = useValidateCoupon();

  const [guestNames, setGuestNames] = useState<string[]>(
    Array.from({ length: guestsCount }, () => ""),
  );
  const [specialRequests, setSpecialRequests] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountAmount: number } | null>(
    null,
  );
  const [isRazorpayProcessing, setIsRazorpayProcessing] = useState(false);

  const nights = Math.max(1, differenceInCalendarDays(new Date(checkOut), new Date(checkIn)));
  const pricePerNight = room ? Number(room.pricePerNight) : 0;
  const subtotal = pricePerNight * nights;
  const taxes = Math.round(subtotal * 0.12 * 100) / 100;
  const discount = appliedCoupon?.discountAmount ?? 0;
  const total = subtotal + taxes - discount;

  async function onApplyCoupon() {
    if (!couponInput.trim()) return;
    try {
      const preview = await validateCoupon.mutateAsync({
        code: couponInput.trim(),
        amount: subtotal + taxes,
      });
      setAppliedCoupon({ code: preview.code, discountAmount: preview.discountAmount });
      toast.success(`Coupon ${preview.code} applied`);
    } catch (error) {
      const message = isAxiosError(error)
        ? (error.response?.data as { error?: string })?.error
        : undefined;
      toast.error(message ?? "Invalid coupon code");
    }
  }

  const canSubmit = useMemo(
    () => guestNames.every((n) => n.trim().length > 0) && !!room,
    [guestNames, room],
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!room || !canSubmit) return;

    try {
      const result = await createBooking.mutateAsync({
        roomId: room.id,
        checkIn,
        checkOut,
        guestsCount,
        unitsBooked: 1,
        guests: guestNames.map((fullName) => ({ fullName })),
        specialRequests: specialRequests || undefined,
        couponCode: appliedCoupon?.code,
      });

      if (result.razorpay) {
        await payWithRazorpay(result.razorpay, result.booking.id, result.booking.bookingRef);
        return;
      }

      if (result.checkoutUrl) {
        window.location.assign(result.checkoutUrl);
        return;
      }

      router.push(`/booking/confirmation/${result.booking.bookingRef}`);
    } catch (error) {
      const message = isAxiosError(error)
        ? (error.response?.data as { error?: string })?.error
        : undefined;
      toast.error(message ?? "Something went wrong. Please try again.");
    }
  }

  async function payWithRazorpay(order: RazorpayOrderInfo, bookingId: string, bookingRef: string) {
    setIsRazorpayProcessing(true);
    const loaded = await loadRazorpayScript();
    if (!loaded || !window.Razorpay) {
      setIsRazorpayProcessing(false);
      toast.error("Couldn't load the payment provider. Please try again.");
      return;
    }

    const razorpayCheckout = new window.Razorpay({
      key: order.keyId,
      amount: Math.round(order.amount * 100),
      currency: order.currency,
      name: "Stayly",
      description: `${order.hotelName} — ${order.roomName}`,
      order_id: order.orderId,
      prefill: {
        name: guestNames[0] || undefined,
        email: user?.email,
      },
      theme: { color: "#2a78d6" },
      handler: async (response) => {
        try {
          await verifyPayment.mutateAsync({
            bookingId,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          router.push(`/booking/confirmation/${bookingRef}`);
        } catch {
          toast.error("Payment succeeded but confirmation failed. Contact support with your booking reference.");
        } finally {
          setIsRazorpayProcessing(false);
        }
      },
      modal: {
        ondismiss: () => {
          setIsRazorpayProcessing(false);
          toast.info("Payment cancelled. Your booking was saved as pending.");
        },
      },
    });

    razorpayCheckout.open();
  }

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Room not found</h1>
      </div>
    );
  }

  const image = room.images[0] ?? room.hotel.images[0];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold tracking-tight">Confirm and pay</h1>

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_380px]">
        <form onSubmit={onSubmit} className="space-y-8">
          <section>
            <h2 className="text-lg font-semibold">Guest details</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {!user && "You'll need to log in before completing this booking."}
            </p>
            <FieldGroup className="mt-4">
              {guestNames.map((name, i) => (
                <Field key={i}>
                  <FieldLabel htmlFor={`guest-${i}`}>
                    {i === 0 ? "Primary guest" : `Guest ${i + 1}`} full name
                  </FieldLabel>
                  <Input
                    id={`guest-${i}`}
                    value={name}
                    onChange={(e) => {
                      const next = [...guestNames];
                      next[i] = e.target.value;
                      setGuestNames(next);
                    }}
                    placeholder="Full name"
                    required
                  />
                </Field>
              ))}

              <Field>
                <FieldLabel htmlFor="special-requests">Special requests (optional)</FieldLabel>
                <Textarea
                  id="special-requests"
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="Early check-in, high floor, dietary needs..."
                  rows={3}
                />
              </Field>
            </FieldGroup>
          </section>

          <section className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            <p className="flex items-center gap-2 font-medium text-foreground">
              <ShieldCheck className="size-4 text-success" />
              Payment
            </p>
            <p className="mt-1">
              You&apos;ll pay securely via Razorpay — cards, UPI, or netbanking. This is a test
              integration, so use Razorpay&apos;s test card (4111 1111 1111 1111, any future
              expiry and CVV) or the UPI success simulator to complete payment.
            </p>
          </section>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={!canSubmit || createBooking.isPending || isRazorpayProcessing || !user}
          >
            {(createBooking.isPending || isRazorpayProcessing) && (
              <Loader2 className="size-4 animate-spin" />
            )}
            {user ? `Pay ${formatINR(total)} and book` : "Log in to continue"}
          </Button>
        </form>

        <aside className="h-fit rounded-2xl border border-border bg-card p-5">
          <div className="flex gap-3">
            {image && (
              <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                <Image src={image.url} alt={room.name} fill sizes="80px" className="object-cover" />
              </div>
            )}
            <div>
              <p className="font-semibold">{room.hotel.name}</p>
              <p className="text-sm text-muted-foreground">{room.name}</p>
              <p className="text-xs text-muted-foreground">
                {room.hotel.city}, {room.hotel.country}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Check-in</span>
              <span>{format(new Date(checkIn), "MMM d, yyyy")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Check-out</span>
              <span>{format(new Date(checkOut), "MMM d, yyyy")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Guests</span>
              <span>{guestsCount}</span>
            </div>
          </div>

          <div className="mt-4 border-t border-border pt-4">
            {appliedCoupon ? (
              <div className="flex items-center justify-between rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
                <span className="flex items-center gap-1.5">
                  <Tag className="size-3.5" />
                  {appliedCoupon.code} applied
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setAppliedCoupon(null);
                    setCouponInput("");
                  }}
                  aria-label="Remove coupon"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  placeholder="Coupon code"
                  className="uppercase"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={validateCoupon.isPending || !couponInput.trim()}
                  onClick={onApplyCoupon}
                >
                  {validateCoupon.isPending ? <Loader2 className="size-4 animate-spin" /> : "Apply"}
                </Button>
              </div>
            )}
          </div>

          <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>
                {formatINR(pricePerNight)} &times; {nights} night{nights > 1 ? "s" : ""}
              </span>
              <span>{formatINR(subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Taxes &amp; fees</span>
              <span>{formatINR(taxes)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-success">
                <span>Discount</span>
                <span>-{formatINR(discount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-2 font-semibold text-foreground">
              <span>Total</span>
              <span>{formatINR(total)}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
