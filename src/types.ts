export type BoardStatus = "draft" | "live" | "closed" | "archived";
export type WishVisibility = "public" | "private";
export type ModerationStatus = "pending" | "approved" | "rejected";

export interface Board {
  id: string;
  owner_id: string;
  slug: string;
  title: string;
  celebrant_name: string;
  occasion: string;
  description: string;
  celebration_at: string;
  status: BoardStatus;
  moderation_enabled: boolean;
  allow_anonymous: boolean;
  allow_public: boolean;
  theme: string;
}
export interface Wish {
  id: string;
  board_id: string;
  sender_name: string | null;
  message: string;
  image_path?: string | null;
  visibility: WishVisibility;
  is_anonymous: boolean;
  moderation_status: ModerationStatus;
  created_at: string;
  reactions?: number;
}
export interface WishlistItem {
  id: string;
  board_id: string;
  name: string;
  description?: string;
  price?: number;
  currency: string;
  status: "available" | "reserved" | "purchased";
  contribution_target?: number;
  amount_contributed?: number;
}

export interface BirthdayPage {
  id: string;
  slug: string;
  celebrant_name: string;
  birthday_date: string;
  headline: string;
  introduction: string;
  theme_key: string;
  custom_primary?: string;
  custom_accent?: string;
  transfer_bank_name?: string | null;
  transfer_account_number?: string | null;
  transfer_account_name?: string | null;
  status: "draft" | "published" | "archived";
  show_fulfilled_items: boolean;
}
export interface PagePhoto {
  id: string;
  storage_path: string;
  signed_url?: string;
  alt_text: string;
  sort_order: number;
  is_cover: boolean;
}
export interface BirthdayWish {
  id: string;
  visitor_name: string;
  message: string;
  selected_photo_id: string;
  created_at: string;
  pinned_at?: string | null;
  visibility?: "public" | "private" | "anonymous";
}
export interface ProtectedWishlistItem {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  price?: number;
  currency: string;
  purchase_url?: string;
  available_anywhere: boolean;
  availability_note?: string;
  allow_bank_transfer: boolean;
  status: "available" | "fulfilled";
  bank_account_id?: string;
}

export interface BirthdayTransferReceipt {
  id: string;
  page_id: string;
  wish_id: string | null;
  sender_name: string;
  transfer_date: string;
  transaction_reference: string | null;
  amount: number | null;
  note: string | null;
  receipt_path: string;
  status: "submitted";
  created_at: string;
  birthday_pages?: {
    celebrant_name: string;
    slug: string;
  } | null;
}
