export type CategoryId =
  | "playa"
  | "montana"
  | "ciudad"
  | "campo"
  | "diseno"
  | "lagos"
  | "unicos"
  | "piscina";

export type SortKey = "recomendados" | "precio-asc" | "precio-desc" | "valoracion";

export type View =
  | "explore"
  | "detail"
  | "feed"
  | "profile"
  | "wishlist"
  | "trips"
  | "messages"
  | "publish";

export interface Review {
  id: string;
  author: string;
  date: string;
  rating: number;
  text: string;
}

export interface Host {
  id: string;
  name: string;
  avatar: string;
  location: string;
  bio: string;
  joined: string;
  responseRate: number;
  responseTime: string;
  languages: string[];
  verified: boolean;
  superhost: boolean;
  reviews: number;
  rating: number;
  work: string;
}

export interface Property {
  id: string;
  title: string;
  type: string;
  city: string;
  region: string;
  country: string;
  categories: CategoryId[];
  price: number;
  cleaning: number;
  rating: number;
  reviewsCount: number;
  images: string[];
  hostId: string;
  guests: number;
  bedrooms: number;
  beds: number;
  baths: number;
  description: string;
  highlights: { title: string; text: string }[];
  amenities: string[];
  rules: string[];
  cancel: "flexible" | "moderada" | "estricta";
  x: number;
  y: number;
  petFriendly: boolean;
  instant: boolean;
  guestFavorite: boolean;
  minNights: number;
  reviews: Review[];
  isNew?: boolean;
}

export interface FeedComment {
  id: string;
  author: string;
  text: string;
}

export interface FeedPost {
  id: string;
  authorId: string;
  propertyId?: string;
  image: string;
  caption: string;
  place: string;
  time: string;
  likes: number;
  comments: FeedComment[];
  kind: "anfitrion" | "viajero" | "guia";
}

export interface ChatMessage {
  id: string;
  from: "me" | "them";
  text: string;
  time: string;
}

export interface Thread {
  id: string;
  hostId: string;
  propertyId: string;
  unread: boolean;
  messages: ChatMessage[];
}

export interface Booking {
  id: string;
  propertyId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  total: number;
  status: "proxima" | "pasada" | "cancelada";
  note: string;
  reviewed: boolean;
}

export interface SearchQuery {
  where: string;
  checkIn: string | null;
  checkOut: string | null;
  adults: number;
  children: number;
  infants: number;
  pets: number;
  category: "todas" | CategoryId;
  maxPrice: number;
  instantOnly: boolean;
  petsOnly: boolean;
  sort: SortKey;
  type: string;
}

export interface PublishInput {
  type: string;
  title: string;
  city: string;
  country: string;
  category: CategoryId;
  guests: number;
  bedrooms: number;
  beds: number;
  baths: number;
  price: number;
  description: string;
  image: string;
}
