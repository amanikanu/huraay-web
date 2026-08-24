import { supabase, isSupabaseConfigured } from "./supabase";
import type { Board, Wish, WishlistItem } from "../types";
import type {
  BirthdayPage,
  BirthdayWish,
  PagePhoto,
  ProtectedWishlistItem,
} from "../types";
import { compressImage, normalizePhone } from "./media";

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

function isMissingColumnError(error: { code?: string; message?: string } | null) {
  return (
    error?.code === "PGRST204" ||
    error?.code === "42703" ||
    Boolean(error?.message?.includes("does not exist"))
  );
}

const CUSTOM_PHOTO_COLUMN_KEY = "huraay_has_custom_photo_path";

function setCustomPhotoColumnSupport(supported: boolean) {
  sessionStorage.setItem(CUSTOM_PHOTO_COLUMN_KEY, supported ? "yes" : "no");
}

async function wishCustomPhotoColumnExists(
  client: ReturnType<typeof requireSupabase>,
) {
  const cached = sessionStorage.getItem(CUSTOM_PHOTO_COLUMN_KEY);
  if (cached === "no") return false;
  if (cached === "yes") return true;

  const probe = await client
    .from("birthday_wishes")
    .select("custom_photo_path")
    .limit(0);

  if (isMissingColumnError(probe.error)) {
    setCustomPhotoColumnSupport(false);
    return false;
  }

  setCustomPhotoColumnSupport(true);
  return true;
}

async function loadPublicWishes(client: ReturnType<typeof requireSupabase>, pageId: string) {
  const includeCustomPhoto = await wishCustomPhotoColumnExists(client);

  if (includeCustomPhoto) {
    const result = await client
      .from("birthday_wishes")
      .select(
        "id,visitor_name,message,selected_photo_id,custom_photo_path,created_at,pinned_at,visibility,moderation_status",
      )
      .eq("page_id", pageId)
      .eq("visibility", "public")
      .order("created_at", { ascending: false });

    if (result.error) throw result.error;
    return result.data ?? [];
  }

  const result = await client
    .from("birthday_wishes")
    .select(
      "id,visitor_name,message,selected_photo_id,created_at,pinned_at,visibility,moderation_status",
    )
    .eq("page_id", pageId)
    .eq("visibility", "public")
    .order("created_at", { ascending: false });

  if (result.error) throw result.error;
  return result.data ?? [];
}

const LAUNCH_PRO_RPC_KEY = "huraay_grant_launch_pro_rpc";

async function ensureLaunchProEntitlement(client: ReturnType<typeof requireSupabase>) {
  if (sessionStorage.getItem(LAUNCH_PRO_RPC_KEY) !== "missing") {
    const { error: rpcError } = await client.rpc("grant_launch_pro");
    if (!rpcError) return;
    if (rpcError.code === "PGRST202") {
      sessionStorage.setItem(LAUNCH_PRO_RPC_KEY, "missing");
    }
  }

  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return;

  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session?.access_token) return;

  const response = await fetch(`${url}/functions/v1/grant-launch-pro`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${session.access_token}`,
    },
  }).catch(() => null);

  if (response?.ok) return;
}

function proGateSetupError() {
  return new Error(
    "Launch setup is incomplete in Supabase. Run the launch SQL in the Supabase dashboard, then try again.",
  );
}

async function saveBirthdayPageViaEdge(input: {
  pageId: string;
  name: string;
  date: string;
  headline: string;
  intro: string;
  phone: string;
  theme: string;
  transfer: { bankName: string | null; accountNumber: string | null; accountName: string | null };
}) {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const client = requireSupabase();
  const {
    data: { session },
  } = await client.auth.getSession();
  if (!url || !key || !session?.access_token) return null;

  const response = await fetch(`${url}/functions/v1/update-birthday-page`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      page_id: input.pageId,
      celebrant_name: input.name,
      birthday_date: input.date,
      headline: input.headline,
      introduction: input.intro,
      whatsapp_number: input.phone,
      theme_key: input.theme,
      transfer_bank_name: input.transfer.bankName,
      transfer_account_number: input.transfer.accountNumber,
      transfer_account_name: input.transfer.accountName,
    }),
  });

  if (response.status === 404) return null;

  const result = (await response.json().catch(() => null)) as
    | { slug?: string; error?: string }
    | null;

  if (!response.ok)
    throw new Error(result?.error ?? "Could not save your Birthday Board");

  return result?.slug ?? null;
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

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 2500,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
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
    const client = requireSupabase();

    // Direct database query (100% reliable, fast, zero console network errors)
    const { data: page, error: pageErr } = await client
      .from("birthday_pages")
      .select(
        "id,slug,celebrant_name,birthday_date,headline,introduction,theme_key,status,show_fulfilled_items,transfer_bank_name,transfer_account_number,transfer_account_name",
      )
      .or(`slug.eq.${slug},vanity_slug.eq.${slug}`)
      .neq("status", "archived")
      .single();

    if (pageErr || !page) throw pageErr ?? new Error("Birthday page not found");

    const [{ data: photos }, wishes] = await Promise.all([
      client
        .from("page_photos")
        .select("id,storage_path,alt_text,sort_order,is_cover")
        .eq("page_id", page.id)
        .order("sort_order"),
      loadPublicWishes(client, page.id),
    ]);

    const safePhotos = await Promise.all(
      (photos ?? []).map(async (photo) => {
        let url = photo.storage_path;
        try {
          const { data } = await client.storage
            .from("birthday-media")
            .createSignedUrl(photo.storage_path, 315360000);
          if (data?.signedUrl) {
            url = data.signedUrl;
          } else {
            url = client.storage.from("birthday-media").getPublicUrl(photo.storage_path).data.publicUrl;
          }
        } catch {
          url = client.storage.from("birthday-media").getPublicUrl(photo.storage_path).data.publicUrl;
        }
        return {
          ...photo,
          storage_path: photo.storage_path,
          signed_url: url,
        };
      }),
    );

    const safeWishes = await Promise.all(
      (wishes ?? []).map(async (wish) => {
        let customUrl: string | null = null;
        if ("custom_photo_path" in wish && wish.custom_photo_path) {
          const customPath = wish.custom_photo_path as string;
          try {
            const { data } = await client.storage
              .from("birthday-media")
              .createSignedUrl(customPath, 315360000);
            if (data?.signedUrl) {
              customUrl = data.signedUrl;
            } else {
              customUrl = client.storage.from("birthday-media").getPublicUrl(customPath).data.publicUrl;
            }
          } catch {
            customUrl = client.storage.from("birthday-media").getPublicUrl(customPath).data.publicUrl;
          }
        }
        return {
          ...wish,
          custom_photo_url: customUrl,
        };
      }),
    );

    return {
      page,
      photos: safePhotos,
      wishes: safeWishes as BirthdayWish[],
      wish_count: safeWishes.length,
    };
  },
  async uploadWishCustomPhoto(pageId: string, file: File) {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key)
      throw new Error("Supabase is not configured for photo uploads");

    const compressed = await compressImage(file, 1600, 0.82);
    const form = new FormData();
    form.append("page_id", pageId);
    form.append(
      "photo",
      compressed,
      compressed.name || "wish-photo.webp",
    );

    const response = await fetch(`${url}/functions/v1/upload-wish-photo`, {
      method: "POST",
      headers: { apikey: key },
      body: form,
    });
    const result = (await response.json().catch(() => null)) as
      | { path?: string; error?: string }
      | null;

    if (!response.ok)
      throw new Error(result?.error ?? "Could not upload your photo");

    if (!result?.path) throw new Error("Could not upload your photo");

    return result.path;
  },
  async submitBirthdayWish(payload: {
    page_id: string;
    selected_photo_id: string;
    visitor_name: string;
    visitor_email?: string | null;
    message: string;
    visibility: "public" | "private" | "anonymous";
    started_at: number;
    website?: string;
    custom_photo_file?: File | null;
  }) {
    const client = requireSupabase();
    const token = `access_${crypto.randomUUID()}`;

    let customPath: string | null = null;
    if (payload.custom_photo_file) {
      customPath = await this.uploadWishCustomPhoto(payload.page_id, payload.custom_photo_file);
    }

    const isAnonymous = payload.visibility === "anonymous";
    const dbVisibility = payload.visibility === "private" ? "private" : "public";
    const rawName = (payload.visitor_name ?? "").trim();
    const dbVisitorName = isAnonymous
      ? rawName || "Someone who loves you"
      : rawName || "A friend";
    const rawEmail = (payload.visitor_email ?? "").trim().toLowerCase();
    const dbVisitorEmail =
      rawEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail) ? rawEmail : null;

    let photoId = payload.selected_photo_id || null;
    if (!photoId && !customPath) {
      try {
        const { data: firstPhoto } = await client
          .from("page_photos")
          .select("id")
          .eq("page_id", payload.page_id)
          .order("sort_order")
          .limit(1)
          .maybeSingle();
        if (firstPhoto?.id) photoId = firstPhoto.id;
      } catch {
        photoId = null;
      }
    }

    const insertPayload = {
      page_id: payload.page_id,
      ...(photoId ? { selected_photo_id: photoId } : {}),
      ...(customPath ? { custom_photo_path: customPath } : {}),
      visitor_name: dbVisitorName,
      ...(dbVisitorEmail ? { visitor_email: dbVisitorEmail } : {}),
      message: payload.message,
      visibility: dbVisibility,
      moderation_status: "published",
    };

    let { data: wish, error } = await client
      .from("birthday_wishes")
      .insert(insertPayload)
      .select("id")
      .single();

    let savedCustomPhotoPath = Boolean(customPath);

    if (isMissingColumnError(error)) {
      const retryPayload = { ...insertPayload };
      const message = String(error?.message ?? "");
      if (message.includes("visitor_email")) delete retryPayload.visitor_email;
      if (message.includes("custom_photo_path")) {
        delete retryPayload.custom_photo_path;
        savedCustomPhotoPath = false;
      }

      ({ data: wish, error } = await client
        .from("birthday_wishes")
        .insert(retryPayload)
        .select("id")
        .single());
    }

    if (error || !wish) throw error ?? new Error("Could not publish wish");

    if (savedCustomPhotoPath) setCustomPhotoColumnSupport(true);

    const customUrl = customPath
      ? client.storage.from("birthday-media").getPublicUrl(customPath).data.publicUrl
      : null;

    sessionStorage.setItem(`huraay_access_${payload.page_id}`, token);
    sessionStorage.setItem(`huraay_name_${payload.page_id}`, payload.visitor_name);

    return { wish_id: wish.id, access_token: token, status: "published", custom_photo_url: customUrl };
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
    const client = requireSupabase();

    const [{ data: page }, { data: items }] = await Promise.all([
      client
        .from("birthday_pages")
        .select("id,whatsapp_number,transfer_bank_name,transfer_account_number,transfer_account_name")
        .eq("id", pageId)
        .single(),
      client
        .from("birthday_wishlist_items")
        .select("id,name,description,price,currency,purchase_url,available_anywhere,allow_bank_transfer,status")
        .eq("page_id", pageId)
        .order("sort_order"),
    ]);

    const transfer_account =
      page?.transfer_bank_name && page?.transfer_account_number
        ? {
            bank_name: page.transfer_bank_name,
            account_number: page.transfer_account_number,
            account_name: page.transfer_account_name ?? "",
          }
        : null;

    return {
      items: (items ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description ?? "",
        price: item.price ?? undefined,
        currency: item.currency ?? "NGN",
        purchase_url: item.purchase_url ?? undefined,
        available_anywhere: item.available_anywhere ?? true,
        availability_note: "",
        allow_bank_transfer: item.allow_bank_transfer ?? Boolean(transfer_account),
        status: item.status === "fulfilled" ? "fulfilled" : "available",
      })),
      bank_accounts: transfer_account ? [{ id: "default", ...transfer_account }] : [],
      transfer_account,
      whatsapp_number: page?.whatsapp_number ?? "",
    };
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
    try {
      const url = import.meta.env.VITE_SUPABASE_URL;
      const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const token = sessionStorage.getItem(`huraay_access_${pageId}`);
      await fetchWithTimeout(
        `${url}/functions/v1/record-page-event`,
        {
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
        },
        2000,
      );
    } catch {
      // Silent catch so event tracking network failures never break UI navigation
    }
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
    const result = await client
      .from("birthday_wishes")
      .select(
        "id,page_id,visitor_name,visitor_email,message,visibility,moderation_status,created_at,birthday_pages!inner(celebrant_name,slug)",
      )
      .order("created_at", { ascending: false });

    if (!isMissingColumnError(result.error)) {
      if (result.error) throw result.error;
      return result.data ?? [];
    }

    const fallback = await client
      .from("birthday_wishes")
      .select(
        "id,page_id,visitor_name,message,visibility,moderation_status,created_at,birthday_pages!inner(celebrant_name,slug)",
      )
      .order("created_at", { ascending: false });

    if (fallback.error) throw fallback.error;
    return (fallback.data ?? []).map((wish) => ({
      ...wish,
      visitor_email: null,
    }));
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
  async grantLaunchPro() {
    const client = requireSupabase();
    await ensureLaunchProEntitlement(client);
  },
  async profile() {
    const client = requireSupabase();
    const user = await requireUser(client, "Sign in to view your profile");
    const { data, error } = await client
      .from("profiles")
      .select("id,display_name,full_name,default_whatsapp_e164,avatar_url")
      .eq("id", user.id)
      .single();
    if (error) {
      return {
        id: user.id,
        display_name: (user.user_metadata?.display_name as string) || (user.user_metadata?.full_name as string) || user.email?.split("@")[0] || "",
        full_name: (user.user_metadata?.full_name as string) || (user.user_metadata?.display_name as string) || "",
        default_whatsapp_e164: "",
        avatar_url: (user.user_metadata?.avatar_url as string) || null,
        email: user.email ?? "",
      };
    }
    return {
      ...data,
      avatar_url: data?.avatar_url || (user.user_metadata?.avatar_url as string) || null,
      email: user.email ?? "",
    };
  },
  async entitlement(): Promise<"free" | "pro"> {
    // 🎉 LAUNCH MODE: All users get Pro for free.
    // To re-enable billing, remove the line below and uncomment the block.
    return "pro";
    /* --- Re-enable when billing goes live ---
    const client = requireSupabase();
    const user = await requireUser(client, "Sign in to view your plan");
    const { data, error } = await client
      .from("account_entitlements")
      .select("plan")
      .eq("user_id", user.id)
      .single();
    if (error) throw error;
    return data?.plan === "pro" ? "pro" : "free";
    --- End billing block --- */
  },
  async uploadAvatar(file: File) {
    const client = requireSupabase();
    const user = await requireUser(client, "Sign in to upload your photo");
    const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const path = `avatars/${user.id}/${crypto.randomUUID()}-${cleanName}`;
    const { error: uploadErr } = await retryOperation(() =>
      client.storage
        .from("birthday-media")
        .upload(path, file, { contentType: file.type || "image/webp", upsert: true }),
    );
    if (uploadErr) throw uploadErr;
    const { data: signed } = await client.storage
      .from("birthday-media")
      .createSignedUrl(path, 315360000);
    const avatarUrl = signed?.signedUrl ?? null;
    if (avatarUrl) {
      await client
        .from("profiles")
        .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
        .eq("id", user.id);
    }
    return avatarUrl;
  },
  async updateProfile(input: {
    full_name: string;
    default_whatsapp_e164?: string | null;
    avatar_url?: string | null;
  }) {
    const client = requireSupabase();
    const user = await requireUser(client, "Sign in to update your profile");
    const { error } = await client
      .from("profiles")
      .update({
        full_name: input.full_name.trim(),
        display_name: input.full_name.trim(),
        default_whatsapp_e164: input.default_whatsapp_e164 || null,
        ...(input.avatar_url !== undefined ? { avatar_url: input.avatar_url } : {}),
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
          .select("id,name,price,purchase_url,description,available_anywhere,sort_order")
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
      photos?: File[];
      items: { name: string; price: string; url: string; description: string; availableAnywhere: boolean; availabilityNote: string }[];
    },
  ) {
    const client = requireSupabase();
    const user = await requireUser(client, "Sign in to update your Birthday Page");
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

    const edgeSaved = await saveBirthdayPageViaEdge({
      pageId,
      name,
      date,
      headline,
      intro,
      phone,
      theme,
      transfer,
    });

    if (!edgeSaved) {
      await ensureLaunchProEntitlement(client);
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
          status: "published",
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", pageId)
        .select("slug")
        .single();
      if (pageError) {
        if (String(pageError.message).includes("Huraay Pro")) throw proGateSetupError();
        throw pageError;
      }
    }

    // Upload new photos if provided during edit
    if (input.photos && input.photos.length > 0) {
      const { count } = await client
        .from("page_photos")
        .select("id", { count: "exact" })
        .eq("page_id", pageId);
      const startSort = count ?? 0;

      for (const [index, file] of input.photos.entries()) {
        const path = await this.uploadBirthdayPhoto(user.id, pageId, file);
        await retryOperation(async () =>
          await client.from("page_photos").insert({
            page_id: pageId,
            storage_path: path,
            alt_text: `${name}'s birthday photo`,
            sort_order: startSort + index,
            is_cover: startSort === 0 && index === 0,
          }),
        );
      }
    }
    const { error: deleteError } = await client
      .from("birthday_wishlist_items")
      .delete()
      .eq("page_id", pageId);
    if (deleteError) throw deleteError;
    if (input.items.length) {
      const itemsParsed = input.items
        .map((item) => ({
          name: text(item.name).trim(),
          price: parsePrice(item.price),
          url: normalizeUrl(item.url),
          description: (item.description ?? "").trim(),
          availableAnywhere: item.availableAnywhere ?? true,
          availabilityNote: (item.availabilityNote ?? "").trim(),
        }))
        .filter((item) => item.name);

      if (itemsParsed.length) {
        try {
          const { error: insertErr } = await client
            .from("birthday_wishlist_items")
            .insert(
              itemsParsed.map((item, index) => ({
                page_id: pageId,
                name: item.name,
                description: item.description || null,
                price: item.price,
                currency: "NGN",
                purchase_url: item.url,
                available_anywhere: item.availableAnywhere,
                status: "available",
                sort_order: index,
              })),
            );
          if (insertErr) {
            console.warn("Primary wishlist insert warning:", insertErr.message);
            await client.from("birthday_wishlist_items").insert(
              itemsParsed.map((item, index) => ({
                page_id: pageId,
                name: item.name,
                description: item.description || null,
                price: item.price,
                currency: "NGN",
                purchase_url: item.url,
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
    // Fetch the slug so the caller can redirect to the live page
    const { data: refreshed } = await client
      .from("birthday_pages")
      .select("slug")
      .eq("id", pageId)
      .single();
    return { slug: refreshed?.slug as string };
  },
  async archiveBirthdayPage(pageId: string) {
    const client = requireSupabase();
    const { error } = await client
      .from("birthday_pages")
      .update({ status: "archived" })
      .eq("id", pageId);
    if (error) throw error;
  },
  async deleteBirthdayPage(pageId: string) {
    const client = requireSupabase();
    const user = await requireUser(client, "Sign in to delete page");
    const { error } = await client
      .from("birthday_pages")
      .delete()
      .eq("id", pageId)
      .eq("owner_id", user.id);
    if (error) throw error;
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
    items: { name: string; price: string; url: string; description: string; availableAnywhere: boolean; availabilityNote: string }[];
  }) {
    const client = requireSupabase();
    const user = await requireUser(client, "Sign in to publish your Birthday Page");
    await ensureLaunchProEntitlement(client);
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

    // 🎉 LAUNCH MODE: No page limits - everyone can create unlimited boards.
    // To re-enable limits, remove this comment block and restore the code below.
    /* --- Re-enable when billing goes live ---
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
    --- End billing block --- */

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
          status: "published",
          published_at: new Date().toISOString(),
        })
        .select("id,slug")
        .single(),
    );

    if (error || !page) {
      if (error && String(error.message).includes("Huraay Pro")) throw proGateSetupError();
      throw error ?? new Error("Could not create Birthday Page");
    }

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
        const itemsParsed = input.items
          .map((item) => ({
            name: text(item.name).trim(),
            price: parsePrice(item.price),
            url: normalizeUrl(item.url),
            description: (item.description ?? "").trim(),
            availableAnywhere: item.availableAnywhere ?? true,
            availabilityNote: (item.availabilityNote ?? "").trim(),
          }))
          .filter((item) => item.name);

        if (itemsParsed.length) {
          try {
            const { error: itemError } = await retryOperation(async () =>
              await client.from("birthday_wishlist_items").insert(
                itemsParsed.map((item, index) => ({
                  page_id: page.id,
                  name: item.name,
                  description: item.description || null,
                  price: item.price,
                  currency: "NGN",
                  purchase_url: item.url,
                  available_anywhere: item.availableAnywhere,
                  status: "available",
                  sort_order: index,
                })),
              ),
            );
            if (itemError) {
              console.warn("Wishlist item insert warning:", itemError.message);
              await retryOperation(async () =>
                await client.from("birthday_wishlist_items").insert(
                  itemsParsed.map((item, index) => ({
                    page_id: page.id,
                    name: item.name,
                    description: item.description || null,
                    price: item.price,
                    currency: "NGN",
                    purchase_url: item.url,
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
