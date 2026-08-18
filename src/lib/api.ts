import { supabase, isSupabaseConfigured } from "./supabase";
import type { Board, Wish, WishlistItem } from "../types";
import type {
  BirthdayPage,
  BirthdayWish,
  PagePhoto,
  ProtectedWishlistItem,
} from "../types";
import { normalizePhone } from "./media";

const requireSupabase = () => {
  if (!supabase)
    throw new Error(
      "Supabase is not configured. Add the project URL and publishable key to the root .env file.",
    );
  return supabase;
};

function normalizeAccountNumber(value: string) {
  return value.replace(/\D/g, "");
}

function text(value: unknown) {
  return String(value ?? "");
}

function parseTransferDetails(input: {
  transferBankName?: string | null;
  transferAccountNumber?: string | null;
  transferAccountName?: string | null;
}) {
  const bankName = text(input.transferBankName).trim();
  const accountNumber = normalizeAccountNumber(text(input.transferAccountNumber));
  const accountName = text(input.transferAccountName).trim();
  const hasAny = Boolean(bankName || accountNumber || accountName);
  if (!hasAny) return { bankName: null, accountNumber: null, accountName: null };
  if (!bankName || !accountNumber || !accountName)
    throw new Error(
      "Add the bank name, account number, and account name together.",
    );
  if (accountNumber.length !== 10)
    throw new Error("Use a valid 10-digit account number.");
  return { bankName, accountNumber, accountName };
}

function parsePrice(value: unknown): number | null {
  if (value == null || value === "") return null;
  const cleaned = String(value).replace(/[^0-9.]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function normalizeUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  let trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }
  return /^https:\/\//i.test(trimmed) ? trimmed : null;
}

async function retryOperation<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 400,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < retries - 1) {
        await new Promise((res) => setTimeout(res, delayMs * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

let pendingRefresh: Promise<any> | null = null;

async function requireUser(
  client: ReturnType<typeof requireSupabase>,
  message: string,
) {
  const { data: sessionData } = await client.auth.getSession();
  let session = sessionData.session;

  if (!session?.user) throw new Error(message);

  // Refresh proactive if within 10 mins of expiry or already expired to avoid 403 network noise
  const isNearExpiry =
    !session.expires_at || session.expires_at * 1000 - Date.now() < 10 * 60 * 1000;

  if (isNearExpiry) {
    if (!pendingRefresh) {
      pendingRefresh = client.auth
        .refreshSession()
        .finally(() => {
          pendingRefresh = null;
        });
    }
    const refreshed = await pendingRefresh.catch(() => null);
    if (refreshed?.data?.session) {
      session = refreshed.data.session;
    }
  }

  // Validate current token with server
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData?.user) {
    const { data: refreshed, error: refreshErr } = await client.auth.refreshSession();
    if (refreshErr || !refreshed.session?.user) {
      throw new Error("Your session has expired. Please sign in again.");
    }
    return refreshed.session.user;
  }

  return userData.user;
}

export const api = {
  configured: isSupabaseConfigured,
  async boardBySlug(slug: string): Promise<Board> {
    const client = requireSupabase();
    const { data, error } = await client
      .from("boards")
      .select("*")
      .eq("slug", slug)
      .single();
    if (error) throw error;
    return data as Board;
  },
  async wishes(boardId: string): Promise<Wish[]> {
    const client = requireSupabase();
    const { data, error } = await client
      .from("wishes")
      .select("*")
      .eq("board_id", boardId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as Wish[];
  },
  async createWish(
    input: Omit<Wish, "id" | "created_at" | "moderation_status">,
  ) {
    const client = requireSupabase();
    const { data, error } = await client
      .from("wishes")
      .insert(input)
      .select()
      .single();
    if (error) throw error;
    return data as Wish;
  },
  async wishlist(boardId: string): Promise<WishlistItem[]> {
    const client = requireSupabase();
    const { data, error } = await client
      .from("wishlist_items")
      .select("*")
      .eq("board_id", boardId)
      .order("created_at");
    if (error) throw error;
    return data as WishlistItem[];
  },
  async signIn(email: string, password: string) {
    const client = requireSupabase();
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },
  async signUp(email: string, password: string, displayName: string) {
    const client = requireSupabase();
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) throw error;
    return data;
  },
  async signInWithGoogle() {
    const client = requireSupabase();
    const { data, error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/app/boards/new` },
    });
    if (error) throw error;
    return data;
  },
  async resetPassword(email: string) {
    const client = requireSupabase();
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth`,
    });
    if (error) throw error;
  },
  async aiWish(payload: {
    occasion: string;
    relationship: string;
    context: string;
    tone: string;
  }) {
    const endpoint = import.meta.env.VITE_AI_ENDPOINT;
    if (!endpoint)
      return "Wishing you a beautiful celebration filled with the same warmth and kindness you bring to everyone around you.";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error("Could not generate a suggestion");
    return (await response.json()).suggestion as string;
  },
  async publicBirthdayPage(slug: string): Promise<{
    page: BirthdayPage;
    photos: PagePhoto[];
    wishes: BirthdayWish[];
    wish_count: number;
  }> {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) throw new Error("Supabase is not configured");
    const response = await fetch(
      `${url}/functions/v1/public-page?slug=${encodeURIComponent(slug)}`,
      { headers: { apikey: key } },
    );
    if (!response.ok) throw new Error("Birthday page not found");
    return response.json();
  },
  async submitBirthdayWish(payload: {
    page_id: string;
    selected_photo_id: string;
    visitor_name: string;
    message: string;
    visibility: "public" | "private";
    started_at: number;
    website?: string;
  }) {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const response = await fetch(`${url}/functions/v1/submit-birthday-wish`, {
      method: "POST",
      headers: { apikey: key!, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Could not publish wish");
    sessionStorage.setItem(
      `huraay_access_${payload.page_id}`,
      result.access_token,
    );
    sessionStorage.setItem(
      `huraay_name_${payload.page_id}`,
      payload.visitor_name,
    );
    return result;
  },
  async protectedWishlist(pageId: string): Promise<{
    items: ProtectedWishlistItem[];
    bank_accounts: {
      id: string;
      bank_name: string;
      account_number: string;
      account_name: string;
    }[];
    transfer_account: {
      bank_name: string;
      account_number: string;
      account_name: string;
    } | null;
    whatsapp_number: string;
  }> {
    const token = sessionStorage.getItem(`huraay_access_${pageId}`);
    if (!token) throw new Error("Leave a birthday wish to unlock");
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const response = await fetch(
      `${url}/functions/v1/protected-wishlist?page_id=${pageId}`,
      { headers: { apikey: key!, "x-visitor-token": token } },
    );
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.error ?? "Wishlist access expired");
    return result;
  },
  async submitBirthdayTransferReceipt(input: {
    pageId: string;
    senderName: string;
    transferDate: string;
    transactionReference?: string;
    amount?: string;
    note?: string;
    receipt: File;
  }) {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const token = sessionStorage.getItem(`huraay_access_${input.pageId}`);
    if (!token) throw new Error("Leave a birthday wish to unlock transfer details");
    const form = new FormData();
    form.append("page_id", input.pageId);
    form.append("sender_name", input.senderName);
    form.append("transfer_date", input.transferDate);
    form.append("transaction_reference", input.transactionReference || "");
    form.append("amount", input.amount || "");
    form.append("note", input.note || "");
    form.append("receipt", input.receipt);
    const response = await fetch(
      `${url}/functions/v1/submit-birthday-transfer-receipt`,
      {
        method: "POST",
        headers: { apikey: key!, "x-visitor-token": token },
        body: form,
      },
    );
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.error ?? "Could not submit transfer receipt");
    return result as { receipt_id: string; status: string };
  },
  async recordPageEvent(
    pageId: string,
    eventName: "gift_clicked" | "bank_copied" | "whatsapp_intent" | "share",
    wishlistItemId?: string,
  ) {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const token = sessionStorage.getItem(`huraay_access_${pageId}`);
    await fetch(`${url}/functions/v1/record-page-event`, {
      method: "POST",
      keepalive: true,
      headers: {
        apikey: key,
        "Content-Type": "application/json",
        ...(token ? { "x-visitor-token": token } : {}),
      },
      body: JSON.stringify({
        page_id: pageId,
        event_name: eventName,
        wishlist_item_id: wishlistItemId,
      }),
    });
  },
  async ownerAnalytics() {
    const client = requireSupabase();
    const { data, error } = await client
      .from("page_events")
      .select("page_id,event_name,visitor_hash,wishlist_item_id,created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  async uploadBirthdayPhoto(userId: string, pageId: string, file: File) {
    const client = requireSupabase();
    const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const path = `${userId}/${pageId}/${crypto.randomUUID()}-${cleanName}`;
    const { error } = await retryOperation(() =>
      client.storage
        .from("birthday-media")
        .upload(path, file, { contentType: file.type || "image/webp", upsert: true }),
    );
    if (error) throw error;
    return path;
  },
  async initializePaystack() {
    const client = requireSupabase();
    const {
      data: { session },
    } = await client.auth.getSession();
    if (!session) throw new Error("Sign in to upgrade");
    const { data, error } = await client.functions.invoke(
      "paystack-initialize",
    );
    if (error) throw error;
    return data as { authorization_url: string; reference: string };
  },
  async adminPayments() {
    const client = requireSupabase();
    const { data, error } = await client.functions.invoke("admin-payments", {
      method: "GET",
    });
    if (error) throw error;
    return data as { submissions: unknown[] };
  },
  async reviewManualPayment(input: {
    submission_id: string;
    decision: "approved" | "rejected" | "more_information_required";
    reason?: string;
  }) {
    const client = requireSupabase();
    const { data, error } = await client.functions.invoke(
      "review-manual-payment",
      { body: input },
    );
    if (error) throw error;
    return data;
  },
  async myBirthdayPages() {
    const client = requireSupabase();
    const { data, error } = await client
      .from("birthday_pages")
      .select(
        "id,slug,celebrant_name,birthday_date,status,published_at,created_at",
      )
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  async ownerWishes() {
    const client = requireSupabase();
    const { data, error } = await client
      .from("birthday_wishes")
      .select(
        "id,page_id,visitor_name,message,visibility,moderation_status,created_at,birthday_pages!inner(celebrant_name,slug)",
      )
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  async moderateWish(
    wishId: string,
    moderationStatus: "published" | "hidden",
  ) {
    const client = requireSupabase();
    const { error } = await client
      .from("birthday_wishes")
      .update({ moderation_status: moderationStatus })
      .eq("id", wishId);
    if (error) throw error;
  },
  async deleteWish(wishId: string) {
    const client = requireSupabase();
    const { error } = await client
      .from("birthday_wishes")
      .delete()
      .eq("id", wishId);
    if (error) throw error;
  },
  async ownerWishlist() {
    const client = requireSupabase();
    const { data, error } = await client
      .from("birthday_wishlist_items")
      .select(
        "id,page_id,name,price,currency,status,sort_order,birthday_pages!inner(celebrant_name,slug)",
      )
      .order("sort_order");
    if (error) throw error;
    return data ?? [];
  },
  async transferReceipts() {
    const client = requireSupabase();
    const { data, error } = await client
      .from("birthday_transfer_receipts")
      .select(
        "id,page_id,wish_id,sender_name,transfer_date,transaction_reference,amount,note,receipt_path,status,created_at,birthday_pages!inner(celebrant_name,slug)",
      )
      .order("created_at", { ascending: false });
    if (error) throw error;
    const rows = await Promise.all(
      (data ?? []).map(async (row) => {
        const { data: receipt } = await client.storage
          .from("birthday-transfer-receipts")
          .createSignedUrl(row.receipt_path, 900);
        return { ...row, receipt_url: receipt?.signedUrl ?? null };
      }),
    );
    return rows;
  },
  async setWishlistStatus(
    itemId: string,
    status: "available" | "fulfilled" | "hidden",
  ) {
    const client = requireSupabase();
    const { error } = await client
      .from("birthday_wishlist_items")
      .update({ status })
      .eq("id", itemId);
    if (error) throw error;
  },
  async deleteWishlistItem(itemId: string) {
    const client = requireSupabase();
    const { error } = await client
      .from("birthday_wishlist_items")
      .delete()
      .eq("id", itemId);
    if (error) throw error;
  },
  async profile() {
    const client = requireSupabase();
    const user = await requireUser(client, "Sign in to view your profile");
    const { data, error } = await client
      .from("profiles")
      .select("id,display_name,full_name,default_whatsapp_e164,avatar_url")
      .eq("id", user.id)
      .single();
    if (error) throw error;
    return { ...data, email: user.email ?? "" };
  },
  async entitlement(): Promise<"free" | "pro"> {
    const client = requireSupabase();
    const user = await requireUser(client, "Sign in to view your plan");
    const { data, error } = await client
      .from("account_entitlements")
      .select("plan")
      .eq("user_id", user.id)
      .single();
    if (error) throw error;
    return data?.plan === "pro" ? "pro" : "free";
  },
  async updateProfile(input: {
    full_name: string;
    default_whatsapp_e164?: string | null;
  }) {
    const client = requireSupabase();
    const user = await requireUser(client, "Sign in to update your profile");
    const { error } = await client
      .from("profiles")
      .update({
        full_name: input.full_name.trim(),
        display_name: input.full_name.trim(),
        default_whatsapp_e164: input.default_whatsapp_e164 || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    if (error) throw error;
  },
  async birthdayPageForEdit(pageId: string) {
    const client = requireSupabase();
    const [{ data: page, error: pageError }, { data: photos, error: photoError }, { data: items, error: itemError }] =
      await Promise.all([
        client
          .from("birthday_pages")
          .select(
            "id,slug,celebrant_name,birthday_date,headline,introduction,whatsapp_number,theme_key,status,transfer_bank_name,transfer_account_number,transfer_account_name",
          )
          .eq("id", pageId)
          .single(),
        client
          .from("page_photos")
          .select("id,storage_path,sort_order,is_cover")
          .eq("page_id", pageId)
          .order("sort_order"),
        client
          .from("birthday_wishlist_items")
          .select("id,name,price,purchase_url,sort_order")
          .eq("page_id", pageId)
          .order("sort_order"),
      ]);
    if (pageError) throw pageError;
    if (photoError) throw photoError;
    if (itemError) throw itemError;
    return { page, photos: photos ?? [], items: items ?? [] };
  },
  async updateBirthdayPage(
    pageId: string,
    input: {
      name?: string | null;
      date?: string | null;
      headline?: string | null;
      intro?: string | null;
      whatsapp?: string | null;
      transferBankName?: string | null;
      transferAccountNumber?: string | null;
      transferAccountName?: string | null;
      theme?: string | null;
      items: { name: string; price: string; url: string }[];
    },
  ) {
    const client = requireSupabase();
    const name = text(input.name).trim();
    const date = text(input.date).trim();
    const headline = text(input.headline).trim();
    const intro = text(input.intro).trim();
    const whatsapp = text(input.whatsapp);
    const theme = text(input.theme).trim();
    const phone = normalizePhone(whatsapp);
    const transfer = parseTransferDetails(input);
    if (!name || !date || !phone)
      throw new Error("Add a valid name, birthday date, and WhatsApp number");
    const { error: pageError } = await client
      .from("birthday_pages")
      .update({
        celebrant_name: name,
        birthday_date: date,
        headline: headline || `${name}'s Birthday`,
        introduction: intro,
        whatsapp_number: phone,
        theme_key: theme,
        transfer_bank_name: transfer.bankName,
        transfer_account_number: transfer.accountNumber,
        transfer_account_name: transfer.accountName,
      })
      .eq("id", pageId);
    if (pageError) throw pageError;
    const { error: deleteError } = await client
      .from("birthday_wishlist_items")
      .delete()
      .eq("page_id", pageId);
    if (deleteError) throw deleteError;
    if (input.items.length) {
      const items = input.items
        .map((item) => ({
          name: text(item.name).trim(),
          price: parsePrice(item.price),
          url: normalizeUrl(item.url),
        }))
        .filter((item) => item.name);

      if (items.length) {
        try {
          const { error: insertErr } = await client
            .from("birthday_wishlist_items")
            .insert(
              items.map((item, index) => ({
                page_id: pageId,
                name: item.name,
                price: item.price,
                currency: "NGN",
                purchase_url: item.url,
                status: "available",
                sort_order: index,
              })),
            );
          if (insertErr) {
            await client.from("birthday_wishlist_items").insert(
              items.map((item, index) => ({
                page_id: pageId,
                name: item.name,
                price: item.price,
                currency: "NGN",
                status: "available",
                sort_order: index,
              })),
            );
          }
        } catch (wishlistErr) {
          console.warn("Could not update wishlist items:", wishlistErr);
        }
      }
    }
  },
  async submitManualPayment(input: {
    sender_name: string;
    transfer_date: string;
    transaction_reference?: string;
    note?: string;
    receipt: File;
  }) {
    const client = requireSupabase();
    const user = await requireUser(client, "Sign in to submit payment proof");
    const extension =
      input.receipt.name.split(".").pop()?.toLowerCase() || "jpg";
    const receiptPath = `${user.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await client.storage
      .from("payment-receipts")
      .upload(receiptPath, input.receipt, { contentType: input.receipt.type });
    if (uploadError) throw uploadError;
    const { data, error } = await client.functions.invoke(
      "submit-manual-payment",
      {
        body: {
          ...input,
          receipt: undefined,
          receipt_path: receiptPath,
        },
      },
    );
    if (error) {
      await client.storage.from("payment-receipts").remove([receiptPath]);
      throw error;
    }
    return data;
  },
  async publishBirthdayPage(input: {
    name?: string | null;
    date?: string | null;
    headline?: string | null;
    intro?: string | null;
    whatsapp?: string | null;
    transferBankName?: string | null;
    transferAccountNumber?: string | null;
    transferAccountName?: string | null;
    theme?: string | null;
    photos: File[];
    items: { name: string; price: string; url: string }[];
  }) {
    const client = requireSupabase();
    const user = await requireUser(client, "Sign in to publish your Birthday Page");
    const name = text(input.name).trim();
    const date = text(input.date).trim();
    const headline = text(input.headline).trim();
    const intro = text(input.intro).trim();
    const whatsapp = text(input.whatsapp);
    const theme = text(input.theme).trim();
    const transfer = parseTransferDetails(input);

    if (
      !name ||
      !date ||
      !normalizePhone(whatsapp) ||
      input.photos.length < 1
    )
      throw new Error(
        "Add your name, birthday date, WhatsApp number, and at least one photo before publishing",
      );

    // Entitlement check - fault tolerant fallback to free if network/RLS issues occur
    let entitlement: { plan: string } | null = null;
    try {
      const res = await client
        .from("account_entitlements")
        .select("plan")
        .eq("user_id", user.id)
        .maybeSingle();
      entitlement = res.data;
    } catch {
      entitlement = null;
    }

    // Page count check - fault tolerant fallback to 0 if count query fails
    let pageCount = 0;
    try {
      const res = await client
        .from("birthday_pages")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .neq("status", "archived");
      pageCount = res.count ?? 0;
    } catch {
      pageCount = 0;
    }

    if ((entitlement?.plan ?? "free") !== "pro" && pageCount >= 1) {
      throw new Error(
        "Free accounts can publish one Birthday Page. Edit your existing page or unlock Pro to create another.",
      );
    }

    const slugBase =
      name
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 45) || "birthday";
    const slug = `${slugBase}-${crypto.randomUUID().slice(0, 4)}`;

    const { data: page, error } = await retryOperation(async () =>
      await client
        .from("birthday_pages")
        .insert({
          owner_id: user.id,
          slug,
          celebrant_name: name,
          birthday_date: date,
          headline: headline || `${name}'s Birthday`,
          introduction: intro,
          whatsapp_number: normalizePhone(whatsapp),
          theme_key: theme,
          transfer_bank_name: transfer.bankName,
          transfer_account_number: transfer.accountNumber,
          transfer_account_name: transfer.accountName,
          status: "draft",
        })
        .select("id,slug")
        .single(),
    );

    if (error || !page)
      throw error ?? new Error("Could not create Birthday Page");

    try {
      for (const [index, file] of input.photos.entries()) {
        const path = await this.uploadBirthdayPhoto(user.id, page.id, file);
        const { error: photoError } = await retryOperation(async () =>
          await client.from("page_photos").insert({
            page_id: page.id,
            storage_path: path,
            alt_text: `${name} birthday photo ${index + 1}`,
            sort_order: index,
            is_cover: index === 0,
          }),
        );
        if (photoError) throw photoError;
      }

      if (input.items.length) {
        const items = input.items
          .map((item) => ({
            name: text(item.name).trim(),
            price: parsePrice(item.price),
            url: normalizeUrl(item.url),
          }))
          .filter((item) => item.name);

        if (items.length) {
          try {
            const { error: itemError } = await retryOperation(async () =>
              await client.from("birthday_wishlist_items").insert(
                items.map((item, index) => ({
                  page_id: page.id,
                  name: item.name,
                  price: item.price,
                  currency: "NGN",
                  purchase_url: item.url,
                  status: "available",
                  sort_order: index,
                })),
              ),
            );
            if (itemError) {
              await retryOperation(async () =>
                await client.from("birthday_wishlist_items").insert(
                  items.map((item, index) => ({
                    page_id: page.id,
                    name: item.name,
                    price: item.price,
                    currency: "NGN",
                    status: "available",
                    sort_order: index,
                  })),
                ),
              );
            }
          } catch (wishlistErr) {
            console.warn("Could not insert wishlist items:", wishlistErr);
          }
        }
      }

      const { error: publishError } = await retryOperation(async () =>
        await client
          .from("birthday_pages")
          .update({ status: "published", published_at: new Date().toISOString() })
          .eq("id", page.id),
      );

      if (publishError) throw publishError;
      return { id: page.id, slug: page.slug };
    } catch (publishError) {
      try {
        await client.from("birthday_pages").delete().eq("id", page.id);
      } catch {
        // ignore cleanup error
      }
      throw publishError;
    }
  },
};
