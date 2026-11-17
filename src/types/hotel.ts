export type PropertyType =
  | "HOTEL"
  | "APARTMENT"
  | "RESORT"
  | "VILLA"
  | "HOSTEL"
  | "GUEST_HOUSE"
  | "COTTAGE";

export type RoomType =
  | "SINGLE"
  | "DOUBLE"
  | "TWIN"
  | "DELUXE"
  | "PREMIUM"
  | "SUITE"
  | "FAMILY"
  | "PRESIDENTIAL"
  | "DORMITORY";

export interface HotelImage {
  id: string;
  url: string;
  altText: string | null;
  position: number;
}

export interface Amenity {
  id: string;
  name: string;
  icon: string | null;
}

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  description: string | null;
  pricePerNight: string;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  totalUnits: number;
  sizeSqm: number | null;
  images: HotelImage[];
}

export interface NearbyAttraction {
  id: string;
  name: string;
  distanceKm: number;
  category: string | null;
}

export interface ReviewUser {
  id: string;
  profile: { firstName: string | null; lastName: string | null; avatarUrl: string | null } | null;
}

export interface Review {
  id: string;
  rating: number;
  title: string | null;
  comment: string;
  ownerReply: string | null;
  createdAt: string;
  user: ReviewUser;
}

export interface HotelCard {
  id: string;
  name: string;
  slug: string;
  city: string;
  country: string;
  propertyType: PropertyType;
  avgRating: number;
  reviewCount: number;
  breakfastIncluded: boolean;
  petFriendly: boolean;
  hasWifi: boolean;
  hasPool: boolean;
  images: HotelImage[];
  lowestPrice: number;
}

export interface HotelDetail extends Omit<HotelCard, "lowestPrice"> {
  description: string;
  addressLine: string;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  checkInTime: string;
  checkOutTime: string;
  hasParking: boolean;
  hasGym: boolean;
  hasSpa: boolean;
  hasRestaurant: boolean;
  accessibility: boolean;
  cancellationPolicy: string | null;
  houseRules: string | null;
  rooms: Room[];
  amenities: { amenity: Amenity }[];
  nearbyAttractions: NearbyAttraction[];
  reviews: Review[];
}

export interface OwnerHotelDetail {
  id: string;
  name: string;
  slug: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
  city: string;
  country: string;
  rooms: Room[];
}

export interface HotelSearchResult {
  items: HotelCard[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
