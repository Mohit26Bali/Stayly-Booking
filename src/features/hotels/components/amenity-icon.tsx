import {
  Wifi,
  Waves,
  ParkingCircle,
  Dumbbell,
  Sparkles,
  UtensilsCrossed,
  Wind,
  PawPrint,
  Wine,
  Plane,
  BellRing,
  Briefcase,
  CircleCheck,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  "Free WiFi": Wifi,
  "Swimming Pool": Waves,
  "Free Parking": ParkingCircle,
  Gym: Dumbbell,
  Spa: Sparkles,
  Restaurant: UtensilsCrossed,
  "Air Conditioning": Wind,
  "Pet Friendly": PawPrint,
  Bar: Wine,
  "Airport Shuttle": Plane,
  "Room Service": BellRing,
  "Business Center": Briefcase,
};

export function AmenityIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] ?? CircleCheck;
  return <Icon className={className} />;
}
