export interface MessageUser {
  id: string;
  email: string;
  role: string;
  profile: { firstName: string | null; lastName: string | null; avatarUrl: string | null } | null;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  imageUrl: string | null;
  readAt: string | null;
  createdAt: string;
  sender?: MessageUser;
}

export interface ConversationHotelSummary {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  images: { url: string }[];
}

export interface Conversation {
  id: string;
  hotelId: string;
  customerId: string;
  subject: string;
  createdAt: string;
  updatedAt: string;
  hotel: ConversationHotelSummary;
  customer: MessageUser;
  messages: Message[];
  unreadCount: number;
}
