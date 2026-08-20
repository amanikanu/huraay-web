import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Bell,
  Camera,
  ChartLine,
  Copy,
  CreditCard,
  Eye,
  Gift,
  Heart,
  Image,
  Lock,
  Plus,
  SignOut,
  SlidersHorizontal,
  Sparkle,
  Trash,
} from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { Button, Empty, Logo, Page, Toast } from "../components/ui";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { normalizePhone } from "../lib/media";
import { supabase } from "../lib/supabase";

type OwnerPage = {
  id: string;
  slug: string;
  celebrant_name: string;
  birthday_date: string;
  status: string;
};
type OwnerWish = {
  id: string;
  visitor_name: string;
  message: string;
  visibility: "public" | "private";
  moderation_status: "pending" | "published" | "hidden";
  created_at: string;
  birthday_pages: { celebrant_name: string; slug: string } | null;
};
type OwnerItem = {
  id: string;
  name: string;
  price: number | null;
  currency: string;
  status: "available" | "fulfilled" | "hidden";
  birthday_pages: { celebrant_name: string; slug: string } | null;
};
type Profile = {
  full_name: string;
  default_whatsapp_e164: string;
  email: string;
  avatar_url?: string | null;
};
type PageEvent = { page_id: string; event_name: string; visitor_hash: string | null; wishlist_item_id: string | null; created_at: string };
type TransferReceipt = {
  id: string;
  sender_name: string;
  transfer_date: string;
  transaction_reference: string | null;
  amount: number | null;
  note: string | null;
  status: string;
  created_at: string;
  receipt_url: string | null;
  birthday_pages:
    | { celebrant_name: string; slug: string }
    | { celebrant_name: string; slug: string }[]
    | null;
};
type Section =
  | "boards"
  | "wishes"
  | "wishlist"
  | "transfers"
  | "analytics"
  | "notifications"
  | "settings";
const nav = [
  { id: "boards", label: "My pages", icon: <Image /> },
  { id: "wishes", label: "Your wishes", icon: <Heart /> },
  { id: "wishlist", label: "Wishlist", icon: <Gift /> },
  { id: "transfers", label: "Transfers", icon: <CreditCard /> },
  { id: "analytics", label: "Analytics", icon: <ChartLine /> },
  { id: "notifications", label: "Activity", icon: <Bell /> },
  { id: "settings", label: "Settings", icon: <SlidersHorizontal /> },
] as const;

export function WorkspacePage() {
  const { signOut } = useAuth();
  const [section, setSection] = useState<Section>("boards");
  const [toast, setToast] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [pages, setPages] = useState<OwnerPage[]>([]);
  const [wishes, setWishes] = useState<OwnerWish[]>([]);
  const [items, setItems] = useState<OwnerItem[]>([]);
  const [receipts, setReceipts] = useState<TransferReceipt[]>([]);
  const [events, setEvents] = useState<PageEvent[]>([]);
  const [profile, setProfile] = useState<Profile>({
    full_name: "",
    default_whatsapp_e164: "",
    email: "",
  });
  const [plan, setPlan] = useState<"free" | "pro">("free");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setNotificationsEnabled(
      window.localStorage.getItem("huraay_wish_notifications") === "true",
    );
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.all([
      api.myBirthdayPages(),
      api.ownerWishes(),
      api.ownerWishlist(),
      api.transferReceipts(),
      api.profile(),
      api.entitlement(),
      api.ownerAnalytics(),
    ])
      .then(([pageRows, wishRows, itemRows, receiptRows, profileRow, entitlement, eventRows]) => {
        if (!active) return;
        setPages(pageRows as OwnerPage[]);
        setWishes(wishRows as unknown as OwnerWish[]);
        setItems(itemRows as unknown as OwnerItem[]);
        setReceipts(receiptRows as unknown as TransferReceipt[]);
        setProfile({
          full_name: profileRow.full_name ?? profileRow.display_name ?? "",
          default_whatsapp_e164: profileRow.default_whatsapp_e164 ?? "",
          email: profileRow.email,
          avatar_url: profileRow.avatar_url ?? null,
        });
        setPlan(entitlement);
        setEvents(eventRows as PageEvent[]);
      })
      .catch((error) => active && setToast(error.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const realtime = supabase;
    if (!realtime) return;
    const channel = realtime
      .channel("huraay-wish-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "birthday_wishes" },
        (payload) => {
          const wish = payload.new as {
            id: string;
            page_id: string;
            visitor_name: string;
            message: string;
            visibility: "public" | "private";
            moderation_status: "pending" | "published" | "hidden";
            created_at: string;
          };
          const page = pages.find((row) => row.id === wish.page_id);
          const wishRow = {
            ...wish,
            birthday_pages: page
              ? { celebrant_name: page.celebrant_name, slug: page.slug }
              : null,
          } as OwnerWish;
          setWishes((current) =>
            current.some((row) => row.id === wishRow.id)
              ? current
              : [wishRow, ...current],
          );
          setToast(`${wish.visitor_name} left a wish`);
          if (notificationsEnabled && "Notification" in window) {
            if (Notification.permission === "granted") {
              new Notification("New Huraay wish", {
                body: page
                  ? `${page.celebrant_name}'s Birthday Page just got a new message.`
                  : "A Birthday Page just got a new message.",
              });
            }
          }
        },
      )
      .subscribe();
    return () => {
      void realtime.removeChannel(channel);
    };
  }, [notificationsEnabled, pages]);

  // 🎉 LAUNCH MODE: all users go straight to board creation.
  // Restore: plan === "free" && pages.length ? "/app/upgrade" : "/app/boards/new"
  const createLink = "/app/boards/new";
  return (
    <Page className="workspace">
      <aside className="workspace-side">
        <Logo />
        <nav>
          {nav.map((item) => (
            <button
              key={item.id}
              className={section === item.id ? "active" : ""}
              onClick={() => setSection(item.id)}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
        <div className="workspace-help">
          <Sparkle />
          <strong>Huraay ✨ Free</strong>
          <p>All features unlocked. Create unlimited boards.</p>
          {/* 🎉 LAUNCH MODE: Upgrade prompt hidden — restore when billing goes live
          {plan === "free" && <Link to="/app/upgrade">Unlock Pro</Link>}
          */}
        </div>
        <button className="user-card" onClick={() => void signOut()}>
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.full_name} className="user-card-avatar" />
          ) : (
            <span>{profile.full_name[0]?.toUpperCase() || "H"}</span>
          )}
          <div>
            <strong>{profile.full_name || "Your profile"}</strong>
            <small>Sign out</small>
          </div>
          <SignOut />
        </button>
      </aside>
      <main className="workspace-main">
        <header className="workspace-top">
          <div>
            <small>Welcome to Huraay</small>
            <h1>{nav.find((item) => item.id === section)?.label}</h1>
          </div>
          {section === "boards" && (
            <Link className="button primary" to={createLink}>
              <Plus /> Add New Board
            </Link>
          )}
        </header>
        <AnimatePresence mode="wait">
          <motion.div
            key={section}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
          >
            {section === "boards" && (
              <Boards pages={pages} setPages={setPages} wishes={wishes} loading={loading} setToast={setToast} />
            )}
            {section === "wishes" && (
              <Wishes wishes={wishes} setWishes={setWishes} setToast={setToast} />
            )}
            {section === "wishlist" && (
              <Wishlist items={items} setItems={setItems} setToast={setToast} />
            )}
            {section === "transfers" && <Transfers receipts={receipts} />}
            {section === "notifications" && <Activity wishes={wishes} />}
            {section === "analytics" && (
              <Analytics events={events} plan={plan} />
            )}
            {section === "settings" && (
              <Settings
                profile={profile}
                setProfile={setProfile}
                setToast={setToast}
                notificationsEnabled={notificationsEnabled}
                setNotificationsEnabled={setNotificationsEnabled}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </Page>
  );
}

function Boards({
  pages,
  setPages,
  wishes,
  loading,
  setToast,
}: {
  pages: OwnerPage[];
  setPages: React.Dispatch<React.SetStateAction<OwnerPage[]>>;
  wishes: OwnerWish[];
  loading: boolean;
  setToast: (msg: string) => void;
}) {
  const archive = async (id: string) => {
    if (!confirm("Archive this Birthday Page?")) return;
    try {
      await api.archiveBirthdayPage(id);
      setPages((current) => current.filter((p) => p.id !== id));
      setToast("Birthday Page archived");
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Page could not be archived");
    }
  };

  const removePage = async (id: string, name: string) => {
    if (
      !confirm(
        `Are you sure you want to delete ${name}'s birthday page permanently? This will remove all photos, wishes, and wishlist items. This action cannot be undone.`,
      )
    )
      return;
    try {
      await api.deleteBirthdayPage(id);
      setPages((current) => current.filter((p) => p.id !== id));
      setToast(`${name}'s Birthday Page permanently deleted`);
    } catch (err) {
      setToast(
        err instanceof Error ? err.message : "Page could not be deleted",
      );
    }
  };

  const copyLink = async (slug: string) => {
    const url = `${window.location.origin}/b/${slug}`;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
        setToast("Page link copied to clipboard!");
        return;
      }
    } catch {
      // fallback
    }
    if (navigator.share) {
      try {
        await navigator.share({ title: "Birthday Page", url });
        return;
      } catch {
        // cancelled
      }
    }
    window.prompt("Copy your Birthday Page link:", url);
  };

  return (
    <>
      <section className="metrics">
        <div><strong>{pages.filter((page) => page.status === "published").length}</strong><span>Published pages</span><small>{pages.length} total</small></div>
        <div><strong>{wishes.length}</strong><span>Total wishes</span><small>{wishes.filter((wish) => wish.moderation_status === "pending").length} awaiting review</small></div>
        <div><strong>{wishes.filter((wish) => wish.visibility === "private").length}</strong><span>Private wishes</span><small>Only visible to you</small></div>
      </section>
      {loading ? (
        <section className="surface fresh-start">Loading your Birthday Pages…</section>
      ) : pages.length ? (
        <section className="owner-page-list">
          {pages.map((page) => (
            <article className="surface owner-page-card" key={page.id}>
              <div>
                <span className={`status-badge ${page.status}`}>{page.status}</span>
                <h2>{page.celebrant_name}'s Birthday</h2>
                <p>{new Intl.DateTimeFormat("en-NG", { dateStyle: "long" }).format(new Date(`${page.birthday_date}T12:00:00`))}</p>
              </div>
              <div className="owner-page-actions">
                <Link className="button secondary" to={`/app/boards/${page.id}/edit`}>Edit</Link>
                {page.status === "published" && (
                  <>
                    <Link className="button primary" to={`/b/${page.slug}`}>View page</Link>
                    <Button variant="secondary" onClick={() => void copyLink(page.slug)}>
                      <Copy /> Copy Link
                    </Button>
                  </>
                )}
                <Button variant="secondary" onClick={() => void archive(page.id)}>Archive</Button>
                <Button variant="danger" onClick={() => void removePage(page.id, page.celebrant_name)}>
                  <Trash /> Delete
                </Button>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="surface fresh-start">
          <Empty icon={<Sparkle />} title="Your next celebration starts here" copy="Create a Birthday Board, add your photos, and share one link." action={<Link className="button primary" to="/app/boards/new"><Plus /> Add New Board</Link>} />
        </section>
      )}
    </>
  );
}

function Wishes({ wishes, setWishes, setToast }: { wishes: OwnerWish[]; setWishes: React.Dispatch<React.SetStateAction<OwnerWish[]>>; setToast: (value: string) => void }) {
  const [filter, setFilter] = useState<"all" | "public" | "private" | "hidden">("all");
  const filtered = wishes.filter((wish) => filter === "all" || (filter === "hidden" ? wish.moderation_status === "hidden" : wish.visibility === filter));
  const update = async (wish: OwnerWish, status: "published" | "hidden") => {
    try {
      await api.moderateWish(wish.id, status);
      setWishes((current) => current.map((row) => row.id === wish.id ? { ...row, moderation_status: status } : row));
      setToast(status === "hidden" ? "Wish hidden from the Wall" : "Wish published");
    } catch (error) { setToast(error instanceof Error ? error.message : "Wish could not be updated"); }
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this wish permanently?")) return;
    try { await api.deleteWish(id); setWishes((current) => current.filter((wish) => wish.id !== id)); setToast("Wish deleted"); }
    catch (error) { setToast(error instanceof Error ? error.message : "Wish could not be deleted"); }
  };
  return <section className="owner-page-list">
    <div className="settings-nav">{(["all", "public", "private", "hidden"] as const).map((value) => <button className={filter === value ? "active" : ""} key={value} onClick={() => setFilter(value)}>{value}</button>)}</div>
    {filtered.length ? filtered.map((wish) => <article className="surface owner-page-card" key={wish.id}>
      <div><span className="status-badge">{wish.visibility === "private" ? <><Lock /> private</> : wish.moderation_status}</span><h2>{wish.visitor_name}</h2><p>{wish.message}</p><small>{wish.birthday_pages?.celebrant_name} · {new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(new Date(wish.created_at))}</small></div>
      <div className="owner-page-actions">{wish.moderation_status === "hidden" || wish.moderation_status === "pending" ? <Button variant="secondary" onClick={() => void update(wish, "published")}><Eye /> Publish</Button> : <Button variant="secondary" onClick={() => void update(wish, "hidden")}><Eye /> Hide</Button>}<Button variant="danger" onClick={() => void remove(wish.id)}><Trash /> Delete</Button></div>
    </article>) : <Empty icon={<Heart />} title="No wishes here" copy="Wishes matching this view will appear here." />}
  </section>;
}

function Wishlist({ items, setItems, setToast }: { items: OwnerItem[]; setItems: React.Dispatch<React.SetStateAction<OwnerItem[]>>; setToast: (value: string) => void }) {
  const change = async (item: OwnerItem, status: OwnerItem["status"]) => {
    try { await api.setWishlistStatus(item.id, status); setItems((current) => current.map((row) => row.id === item.id ? { ...row, status } : row)); setToast("Wishlist updated"); }
    catch (error) { setToast(error instanceof Error ? error.message : "Wishlist could not be updated"); }
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this wishlist item?")) return;
    try { await api.deleteWishlistItem(id); setItems((current) => current.filter((item) => item.id !== id)); setToast("Wishlist item deleted"); }
    catch (error) { setToast(error instanceof Error ? error.message : "Item could not be deleted"); }
  };
  return <section className="owner-page-list">{items.length ? items.map((item) => <article className="surface owner-page-card" key={item.id}><div><span className={`status-badge ${item.status}`}>{item.status}</span><h2>{item.name}</h2><p>{item.price != null ? new Intl.NumberFormat("en-NG", { style: "currency", currency: item.currency }).format(item.price) : "No price added"}</p><small>{item.birthday_pages?.celebrant_name}</small></div><div className="owner-page-actions">{item.status !== "fulfilled" && <Button variant="secondary" onClick={() => void change(item, "fulfilled")}>Mark fulfilled</Button>}{item.status === "hidden" ? <Button variant="secondary" onClick={() => void change(item, "available")}>Show</Button> : <Button variant="secondary" onClick={() => void change(item, "hidden")}>Hide</Button>}<Button variant="danger" onClick={() => void remove(item.id)}><Trash /></Button></div></article>) : <Empty icon={<Gift />} title="Your wishlist is empty" copy="Add thoughtful gift ideas while creating or editing a Birthday Page." />}</section>;
}

function Activity({ wishes }: { wishes: OwnerWish[] }) {
  return <section className="owner-page-list">{wishes.length ? wishes.slice(0, 20).map((wish) => <article className="surface owner-page-card" key={wish.id}><div><span className="status-badge"><Bell /> new wish</span><h2>{wish.visitor_name} left a wish</h2><p>{wish.message}</p><small>{new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(wish.created_at))}</small></div></article>) : <Empty icon={<Bell />} title="All quiet for now" copy="New wish activity will appear here." />}</section>;
}

function Transfers({ receipts }: { receipts: TransferReceipt[] }) {
  return (
    <section className="owner-page-list">
      {receipts.length ? (
        receipts.map((receipt) => {
          const pageInfo = Array.isArray(receipt.birthday_pages)
            ? receipt.birthday_pages[0]
            : receipt.birthday_pages;
          return (
            <article className="surface owner-page-card" key={receipt.id}>
              <div>
                <span className="status-badge submitted">receipt submitted</span>
                <h2>{receipt.sender_name}</h2>
                <p>
                  {pageInfo?.celebrant_name || "Birthday Page"} ·{" "}
                  {receipt.amount != null
                    ? new Intl.NumberFormat("en-NG", {
                        style: "currency",
                        currency: "NGN",
                      }).format(receipt.amount)
                    : "No amount added"}
                </p>
                <small>
                  {receipt.transfer_date}{" "}
                  {receipt.transaction_reference
                    ? `· Ref ${receipt.transaction_reference}`
                    : ""}
                </small>
                {receipt.note && <small>{receipt.note}</small>}
                <small>
                  {new Intl.DateTimeFormat("en-NG", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(receipt.created_at))}
                </small>
              </div>
              <div className="owner-page-actions">
                {receipt.receipt_url && (
                  <a
                    className="button secondary"
                    href={receipt.receipt_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open receipt
                  </a>
                )}
              </div>
            </article>
          );
        })
      ) : (
        <Empty
          icon={<CreditCard />}
          title="No transfer receipts yet"
          copy="Receipts uploaded by visitors will appear here."
        />
      )}
    </section>
  );
}
function Analytics({ events, plan }: { events: PageEvent[]; plan: "free" | "pro" }) {
  // 🎉 LAUNCH MODE: Analytics visible to all users.
  // Restore gate: if (plan !== "pro") return <section ...>...</section>
  void plan; // kept so prop signature stays intact for future re-activation
  const count = (name: string) => events.filter((event) => event.event_name === name).length;
  const uniqueVisitors = new Set(events.filter((event) => event.event_name === "page_view").map((event) => event.visitor_hash).filter(Boolean)).size;
  return <><section className="metrics"><div><strong>{count("page_view")}</strong><span>Page views</span><small>{uniqueVisitors} unique visitors</small></div><div><strong>{count("wishlist_unlocked")}</strong><span>Wishlist unlocks</span><small>{count("gift_clicked")} purchase clicks</small></div><div><strong>{count("whatsapp_intent")}</strong><span>WhatsApp intents</span><small>{count("bank_copied")} bank copies</small></div></section><section className="surface fresh-start"><h2>Birthday funnel</h2><p>{uniqueVisitors} visitors → {count("wish_submitted")} wishes → {count("wishlist_unlocked")} unlocks → {count("gift_clicked") + count("bank_copied") + count("whatsapp_intent")} gift interactions.</p></section></>;
}

function Settings({
  profile,
  setProfile,
  setToast,
  notificationsEnabled,
  setNotificationsEnabled,
}: {
  profile: Profile;
  setProfile: React.Dispatch<React.SetStateAction<Profile>>;
  setToast: (value: string) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const [busy, setBusy] = useState(false);
  const phoneHint = useMemo(() => normalizePhone(profile.default_whatsapp_e164), [profile.default_whatsapp_e164]);

  const enableNotifications = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setToast("This browser does not support notifications");
      return;
    }
    const permission = await Notification.requestPermission();
    const enabled = permission === "granted";
    setNotificationsEnabled(enabled);
    window.localStorage.setItem("huraay_wish_notifications", String(enabled));
    setToast(enabled ? "Live wish notifications enabled" : "Notifications were not enabled");
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await api.updateProfile({ full_name: profile.full_name, default_whatsapp_e164: phoneHint || null });
      setToast("Profile changes saved");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Profile could not be saved");
    } finally {
      setBusy(false);
    }
  };

  const { refreshProfile } = useAuth();
  const initial = profile.full_name?.[0]?.toUpperCase() || "H";

  return (
    <div className="settings-layout">
      {/* Profile hero */}
      <div className="settings-hero surface">
        <label className="settings-avatar-wrapper" title="Click to upload profile photo">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.full_name} className="settings-avatar-img" />
          ) : (
            <div className="settings-avatar">{initial}</div>
          )}
          <span className="settings-avatar-overlay">
            <Camera />
          </span>
          <input
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                setToast("Uploading profile picture...");
                const url = await api.uploadAvatar(file);
                if (url) {
                  setProfile((c) => ({ ...c, avatar_url: url }));
                  await refreshProfile();
                  setToast("Profile picture updated");
                }
              } catch (err) {
                setToast(err instanceof Error ? err.message : "Could not upload photo");
              }
            }}
          />
        </label>
        <div className="settings-hero-info">
          <h2>{profile.full_name || "Your profile"}</h2>
          <span>{profile.email}</span>
          <small className="settings-photo-hint">Click avatar photo to customize profile picture</small>
        </div>
      </div>

      {/* Profile form */}
      <section className="surface settings-card">
        <div className="settings-card-head">
          <SlidersHorizontal />
          <div>
            <h3>Profile details</h3>
            <p>Your name is shown on birthday pages you create.</p>
          </div>
        </div>
        <form onSubmit={save} className="settings-fields">
          <label className="field">
            <span>Full name</span>
            <input
              value={profile.full_name}
              onChange={(e) => setProfile((c) => ({ ...c, full_name: e.target.value }))}
              required
              placeholder="Your full name"
            />
          </label>
          <label className="field">
            <span>Email address</span>
            <input value={profile.email} type="email" disabled />
          </label>
          <label className="field">
            <span>Default WhatsApp number</span>
            <input
              value={profile.default_whatsapp_e164}
              inputMode="tel"
              placeholder="+234 801 234 5678"
              onChange={(e) => setProfile((c) => ({ ...c, default_whatsapp_e164: e.target.value }))}
            />
            <small>{phoneHint ? `Saved as ${phoneHint}` : "Add a valid international or Nigerian number"}</small>
          </label>
          <div className="settings-save-row">
            <Button disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>
          </div>
        </form>
      </section>

      {/* Notifications */}
      <section className="surface settings-card">
        <div className="settings-card-head">
          <Bell />
          <div>
            <h3>Wish notifications</h3>
            <p>Get a browser alert the moment someone leaves a wish.</p>
          </div>
        </div>
        <div className="settings-notification-row">
          <span className={`notif-status ${notificationsEnabled ? "on" : "off"}`}>
            {notificationsEnabled ? "\u2713 Enabled" : "Disabled"}
          </span>
          <Button
            variant={notificationsEnabled ? "secondary" : "primary"}
            onClick={() => void enableNotifications()}
          >
            {notificationsEnabled ? "Disable" : "Enable notifications"}
          </Button>
        </div>
      </section>
    </div>
  );
}


