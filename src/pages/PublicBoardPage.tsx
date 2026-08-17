import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  Check,
  Copy,
  Gift,
  Heart,
  Lock,
  ShareNetwork,
  ShoppingBag,
  Sparkle,
  WhatsappLogo,
  X,
} from "@phosphor-icons/react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";
import type {
  BirthdayPage,
  BirthdayWish,
  PagePhoto,
  ProtectedWishlistItem,
} from "../types";
import {
  Button,
  Empty,
  Field,
  Logo,
  Page,
  ReceiptUploader,
  Skeleton,
  Toast,
  Dialog,
} from "../components/ui";
import { CelebrationBurst } from "../components/Celebration";
import { whatsappLink } from "../lib/media";

type PublicData = {
  page: BirthdayPage;
  photos: PagePhoto[];
  wishes: BirthdayWish[];
  wish_count: number;
};
export function PublicBoardPage() {
  const { slug = "" } = useParams();
  const [data, setData] = useState<PublicData>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [wishOpen, setWishOpen] = useState(false);
  const [wishStartedAt, setWishStartedAt] = useState(0);
  const [unlocked, setUnlocked] = useState(false);
  const [wishlist, setWishlist] = useState<{
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
  } | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [toast, setToast] = useState("");
  const [receiptOpen, setReceiptOpen] = useState(false);
  useEffect(() => {
    const meta = document.querySelector('meta[name="robots"]');
    const previous = meta?.getAttribute("content");
    meta?.setAttribute("content", "noindex,nofollow");
    api
      .publicBirthdayPage(slug)
      .then((result) => {
        setData(result);
        const hasToken = Boolean(
          sessionStorage.getItem(`huraay_access_${result.page.id}`),
        );
        if (hasToken) unlock(result.page.id);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    return () => {
      if (previous) meta?.setAttribute("content", previous);
    };
  }, [slug]);
  async function unlock(pageId: string) {
    try {
      const result = await api.protectedWishlist(pageId);
      setWishlist(result);
      setUnlocked(true);
    } catch {
      setUnlocked(false);
    }
  }
  function openWish() {
    setWishStartedAt(Date.now());
    setWishOpen(true);
  }
  if (loading)
    return (
      <Page>
        <header className="board-nav wrap">
          <Logo />
        </header>
        <main className="birthday-public">
          <Skeleton rows={6} />
        </main>
      </Page>
    );
  if (error || !data)
    return (
      <Page>
        <Empty
          icon={<Heart />}
          title="Birthday page unavailable"
          copy="This page may be private, archived, or the link may be incorrect."
          action={
            <Link className="button primary" to="/">
              Go to Huraay
            </Link>
          }
        />
      </Page>
    );
  const { page, photos, wishes } = data;
  const transferAccount = wishlist?.transfer_account ?? null;
  const cover = photos.find((p) => p.is_cover) ?? photos[0];
  const date = new Date(`${page.birthday_date}T00:00:00`);
  const days = Math.ceil((date.getTime() - Date.now()) / 86400000);
  const countdown =
    days > 1
      ? `${days} days to ${page.celebrant_name}'s birthday`
      : days === 1
        ? `Tomorrow is ${page.celebrant_name}'s birthday`
        : days === 0
          ? `Today is ${page.celebrant_name}'s Birthday`
          : `Celebrating ${page.celebrant_name}`;
  const photoUrl = (path: string) =>
    photos.find((photo) => photo.storage_path === path)?.signed_url ?? "";
  async function share() {
    void api.recordPageEvent(page.id, "share");
    if (navigator.share)
      await navigator.share({ title: page.headline, url: location.href });
    else {
      await navigator.clipboard.writeText(location.href);
      setToast("Birthday link copied");
    }
  }
  return (
    <Page className={`birthday-page theme-${page.theme_key}`}>
      <header className="birthday-nav">
        <Logo />
        <Button variant="secondary" onClick={share}>
          <ShareNetwork /> Share
        </Button>
      </header>
      <main>
        <section className="birthday-hero">
          {cover && (
            <img
              src={photoUrl(cover.storage_path)}
              alt={cover.alt_text || `${page.celebrant_name}'s birthday cover`}
              fetchPriority="high"
            />
          )}
          <div className="birthday-hero-shade" />
          <div className="birthday-hero-content">
            <span>{countdown}</span>
            <h1>{page.headline}</h1>
            <p>
              {new Intl.DateTimeFormat("en-NG", {
                day: "numeric",
                month: "long",
              }).format(date)}
            </p>
            <Button onClick={openWish}>
              Leave a Birthday Wish <Heart weight="fill" />
            </Button>
          </div>
        </section>
        <section className="birthday-intro birthday-container">
          <Sparkle />
          <p>{page.introduction}</p>
        </section>
        {photos.length > 1 && (
          <section className="photo-story">
            <div className="photo-track">
              {photos.map((photo, index) => (
                <motion.figure key={photo.id} whileHover={{ y: -4 }}>
                  <img
                    src={photoUrl(photo.storage_path)}
                    alt={
                      photo.alt_text ||
                      `${page.celebrant_name} photo ${index + 1}`
                    }
                    loading="lazy"
                  />
                  <figcaption>{String(index + 1).padStart(2, "0")}</figcaption>
                </motion.figure>
              ))}
            </div>
          </section>
        )}
        <section className="wish-wall birthday-container">
          <div className="birthday-section-head">
            <div>
              <span>Birthday Wish Wall</span>
              <h2>Love, in everyone’s words.</h2>
            </div>
            <strong>{data.wish_count}</strong>
          </div>
          {wishes.length ? (
            <div className="wish-masonry">
              {wishes.map((wish, index) => (
                <motion.article
                  className={`birthday-wish-card variation-${index % 3}`}
                  key={wish.id}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                >
                  <div>
                    {wish.selected_photo_id && (
                      <span>{wish.visitor_name[0]}</span>
                    )}
                    <small>
                      {new Date(wish.created_at).toLocaleDateString("en-NG", {
                        day: "numeric",
                        month: "short",
                      })}
                    </small>
                  </div>
                  <p>{wish.message}</p>
                  <strong>{wish.visitor_name}</strong>
                </motion.article>
              ))}
            </div>
          ) : (
            <Empty
              icon={<Heart />}
              title="The Wish Wall is waiting"
              copy={`Be the first person to celebrate ${page.celebrant_name}.`}
              action={
                <Button onClick={openWish}>
                  Leave the first wish
                </Button>
              }
            />
          )}
        </section>
        <section className="wishlist-zone birthday-container">
          <AnimatePresence mode="wait">
            {!unlocked ? (
              <motion.div
                className="wishlist-lock"
                key="locked"
                exit={{ opacity: 0, scale: 0.97 }}
              >
                <div className="bow-lock">
                  <Lock />
                </div>
                <span>{page.celebrant_name}'s Wishlist</span>
                <h2>A little birthday magic is waiting.</h2>
                <p>
                  Leave a birthday wish to unlock gift ideas, links, and ways to
                  help make the day special.
                </p>
                <Button onClick={openWish}>
                  Leave a Wish to Unlock <ArrowRight />
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="unlocked"
                className="wishlist-unlocked"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="birthday-section-head">
                  <div>
                    <span>Wishlist unlocked</span>
                    <h2>A few things {page.celebrant_name} would love.</h2>
                  </div>
                  <Gift />
                </div>
                {wishlist!.items.length ? (
                  <div className="birthday-gifts">
                    {wishlist!.items.map((item) => (
                      <GiftCard
                        key={item.id}
                        item={item}
                        name={
                          sessionStorage.getItem(`huraay_name_${page.id}`) ||
                          "A friend"
                        }
                        accounts={wishlist!.bank_accounts}
                        transferAccount={wishlist!.transfer_account}
                        phone={wishlist!.whatsapp_number}
                        pageId={page.id}
                        toast={setToast}
                      />
                    ))}
                  </div>
                ) : (
                  <Empty
                    icon={<Gift />}
                    title="No wishlist items yet"
                    copy="The birthday wish still means everything."
                  />
                )}
                {transferAccount && (
                  <section className="transfer-card">
                    <div>
                      <span>Send birthday money directly</span>
                      <h3>{page.celebrant_name}'s transfer account</h3>
                      <p>
                        Use this if you already made a transfer or want to send
                        money instead of buying a gift.
                      </p>
                    </div>
                    <div className="bank-reveal">
                      <span>{transferAccount.bank_name}</span>
                      <strong>{transferAccount.account_number}</strong>
                      <p>{transferAccount.account_name}</p>
                    </div>
                    <div className="gift-actions">
                      <Button
                        variant="secondary"
                        onClick={async () => {
                          await navigator.clipboard.writeText(
                            transferAccount.account_number,
                          );
                          void api.recordPageEvent(page.id, "bank_copied");
                          setToast("Account number copied");
                        }}
                      >
                        <Copy /> Copy account number
                      </Button>
                      <Button onClick={() => setReceiptOpen(true)}>
                        Upload transfer receipt
                      </Button>
                    </div>
                  </section>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
        <section className="birthday-share birthday-container">
          <Heart />
          <h2>Bring more people into the celebration.</h2>
          <p>
            Share this birthday page with friends, family, and every group chat
            that matters.
          </p>
          <Button onClick={share}>
            <ShareNetwork /> Share this Birthday Page
          </Button>
        </section>
        <section className="birthday-discovery">
          <Logo />
          <p>Make your birthday feel like your day.</p>
          <Link className="button secondary" to="/app/boards/new">
            Create My Birthday Page <ArrowRight />
          </Link>
        </section>
      </main>
      {wishOpen && (
        <WishSheet
          page={page}
          photos={photos}
          photoUrl={photoUrl}
          startedAt={wishStartedAt}
          close={() => setWishOpen(false)}
          submitted={async () => {
            setCelebrate(true);
            setWishOpen(false);
            await unlock(page.id);
            setTimeout(() => setCelebrate(false), 1800);
          }}
        />
      )}
      <TransferReceiptDialog
        open={receiptOpen}
        pageId={page.id}
        celebrantName={page.celebrant_name}
        transferAccount={wishlist?.transfer_account ?? null}
        onClose={() => setReceiptOpen(false)}
        onSubmitted={async () => {
          setReceiptOpen(false);
          setToast("Receipt received");
        }}
      />
      <CelebrationBurst active={celebrate} />
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </Page>
  );
}

function WishSheet({
  page,
  photos,
  photoUrl,
  startedAt,
  close,
  submitted,
}: {
  page: BirthdayPage;
  photos: PagePhoto[];
  photoUrl: (p: string) => string;
  startedAt: number;
  close: () => void;
  submitted: () => void;
}) {
  const saved = useMemo(() => {
    try {
      return JSON.parse(
        localStorage.getItem(`huraay_wish_draft_${page.id}`) || "{}",
      );
    } catch {
      return {};
    }
  }, [page.id]);
  const [name, setName] = useState(saved.name || "");
  const [message, setMessage] = useState(saved.message || "");
  const [visibility, setVisibility] = useState<"public" | "private">(
    saved.visibility === "private" ? "private" : "public",
  );
  const [photo, setPhoto] = useState(saved.photo || photos[0]?.id || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.submitBirthdayWish({
        page_id: page.id,
        selected_photo_id: photo,
        visitor_name: name,
        message,
        visibility,
        started_at: startedAt,
        website: "",
      });
      localStorage.removeItem(`huraay_wish_draft_${page.id}`);
      await submitted();
    } catch (err) {
      localStorage.setItem(
        `huraay_wish_draft_${page.id}`,
        JSON.stringify({ name, message, visibility, photo }),
      );
      setError(
        err instanceof Error
          ? `${err.message} Your message is still here. Try again.`
          : "We couldn't publish your wish. Your message is still here. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <motion.div
        className="wish-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wish-title"
        onMouseDown={(e) => e.stopPropagation()}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 220, damping: 25 }}
      >
        <button className="modal-close" onClick={close} aria-label="Close">
          <X />
        </button>
        <span>For {page.celebrant_name}</span>
        <h2 id="wish-title">Leave a Birthday Wish</h2>
        <p>Choose a favourite photo and write something personal.</p>
        <form onSubmit={send}>
          <Field label="Your name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              required
              autoComplete="name"
            />
          </Field>
          <fieldset className="photo-choice">
            <legend>Choose one of their photos</legend>
            <div>
              {photos.map((item) => (
                <button
                  type="button"
                  className={photo === item.id ? "selected" : ""}
                  onClick={() => setPhoto(item.id)}
                  key={item.id}
                >
                  <img src={photoUrl(item.storage_path)} alt={item.alt_text} />
                  {photo === item.id && <Check />}
                </button>
              ))}
            </div>
          </fieldset>
          <Field label="Birthday message">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
              required
            />
            <small>{500 - message.length} characters remaining</small>
          </Field>
          <fieldset className="visibility-choice">
            <legend>Who can see this?</legend>
            <button
              type="button"
              className={visibility === "public" ? "selected" : ""}
              onClick={() => setVisibility("public")}
            >
              <strong>Public</strong>
              <small>Everyone visiting this page can see your message.</small>
            </button>
            <button
              type="button"
              className={visibility === "private" ? "selected" : ""}
              onClick={() => setVisibility("private")}
            >
              <strong>Private</strong>
              <small>Only the Birthday Page owner can see your message.</small>
            </button>
          </fieldset>
          {error && <div className="form-error">{error}</div>}
          <Button type="submit" disabled={busy || !photo}>
            {busy ? "Publishing your wish..." : "Publish Birthday Wish"}{" "}
            <Heart />
          </Button>
        </form>
      </motion.div>
    </div>
  );
}

function GiftCard({
  item,
  name,
  accounts,
  transferAccount,
  phone,
  pageId,
  toast,
}: {
  item: ProtectedWishlistItem;
  name: string;
  accounts: {
    id: string;
    bank_name: string;
    account_number: string;
    account_name: string;
  }[];
  transferAccount: {
    bank_name: string;
    account_number: string;
    account_name: string;
  } | null;
  phone: string;
  pageId: string;
  toast: (v: string) => void;
}) {
  const [bank, setBank] = useState(false);
  const account = accounts.find((a) => a.id === item.bank_account_id) ?? transferAccount;
  const money = useMemo(
    () =>
      item.price
        ? new Intl.NumberFormat("en-NG", {
            style: "currency",
            currency: item.currency,
            maximumFractionDigits: 0,
          }).format(item.price)
        : null,
    [item],
  );
  return (
    <article className={`birthday-gift ${item.status}`}>
      <div className="gift-image">
        <ShoppingBag />
      </div>
      <span>
        {item.status === "fulfilled" ? "Wish Fulfilled" : "Available"}
      </span>
      <h3>{item.name}</h3>
      <p>{item.description}</p>
      {money && <strong>{money}</strong>}
      {item.status !== "fulfilled" && (
        <div className="gift-actions">
          {item.purchase_url && (
            <a
              className="button primary"
              href={item.purchase_url}
              target="_blank"
              rel="noreferrer"
              onClick={() => void api.recordPageEvent(pageId, "gift_clicked", item.id)}
            >
              Buy Gift <ArrowRight />
            </a>
          )}
          <a
            className="button secondary"
            href={whatsappLink(phone, name, item.name)}
            target="_blank"
            rel="noreferrer"
            onClick={() => void api.recordPageEvent(pageId, "whatsapp_intent", item.id)}
          >
            <WhatsappLogo /> I'd Like to Fulfil This
          </a>
          {item.allow_bank_transfer && account && (
            <Button variant="ghost" onClick={() => setBank(!bank)}>
              Send Money Instead
            </Button>
          )}
        </div>
      )}
      {bank && account && (
        <div className="bank-reveal">
          <span>{account.bank_name}</span>
          <strong>{account.account_number}</strong>
          <p>{account.account_name}</p>
          <Button
            variant="secondary"
            onClick={async () => {
              await navigator.clipboard.writeText(account.account_number);
              void api.recordPageEvent(pageId, "bank_copied", item.id);
              toast("Account number copied");
            }}
          >
            <Copy /> Copy Account Number
          </Button>
        </div>
      )}
    </article>
  );
}

function TransferReceiptDialog({
  open,
  pageId,
  celebrantName,
  transferAccount,
  onClose,
  onSubmitted,
}: {
  open: boolean;
  pageId: string;
  celebrantName: string;
  transferAccount: {
    bank_name: string;
    account_number: string;
    account_name: string;
  } | null;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [receipt, setReceipt] = useState<File | null>(null);
  const [senderName, setSenderName] = useState(sessionStorage.getItem(`huraay_name_${pageId}`) || "");
  const [transferDate, setTransferDate] = useState("");
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!receipt) {
      setError("Upload the transfer receipt before submitting");
      return;
    }
    if (!senderName.trim() || !transferDate) {
      setError("Add the sender name and transfer date");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.submitBirthdayTransferReceipt({
        pageId,
        senderName,
        transferDate,
        transactionReference: reference,
        amount,
        note,
        receipt,
      });
      setReceipt(null);
      setReference("");
      setAmount("");
      setNote("");
      onSubmitted();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not submit the transfer receipt",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      title="Upload transfer receipt"
      description={`Share proof of your transfer to ${celebrantName}.`}
      onClose={onClose}
      className="receipt-dialog"
    >
      <form className="editor-form" onSubmit={submit}>
        {transferAccount && (
          <section className="receipt-bank">
            <span>Transfer account</span>
            <strong>{transferAccount.bank_name}</strong>
            <p>{transferAccount.account_number}</p>
            <small>{transferAccount.account_name}</small>
          </section>
        )}
        <Field label="Sender name">
          <input
            value={senderName}
            onChange={(event) => setSenderName(event.target.value)}
            autoComplete="name"
            maxLength={120}
            required
          />
        </Field>
        <Field label="Transfer date">
          <input
            type="date"
            value={transferDate}
            onChange={(event) => setTransferDate(event.target.value)}
            required
          />
        </Field>
        <Field label="Transaction reference (optional)">
          <input
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            maxLength={120}
            placeholder="Bank receipt number"
          />
        </Field>
        <Field label="Amount (optional)">
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            inputMode="decimal"
            placeholder="50000"
          />
        </Field>
        <Field label="Note (optional)">
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={500}
            placeholder="Which gift or wish this transfer is for"
          />
        </Field>
        <Field label="Receipt">
          <ReceiptUploader file={receipt} onChange={setReceipt} />
        </Field>
        {error && <div className="form-error">{error}</div>}
        <div className="form-actions">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Submitting..." : "Submit receipt"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
