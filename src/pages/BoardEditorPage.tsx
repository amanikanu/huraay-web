import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CreditCard,
  Crown,
  Eye,
  Gift,
  Image,
  Lock,
  Plus,
  Sparkle,
  WhatsappLogo,
} from "@phosphor-icons/react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Button,
  DatePicker,
  Dialog,
  Field,
  Logo,
  Page,
  PhotoUploader,
  Toast,
} from "../components/ui";
import { CelebrationBurst } from "../components/Celebration";
import { normalizePhone } from "../lib/media";
import { api } from "../lib/api";
import {
  clearBoardDraft,
  loadBoardDraft,
  saveBoardDraft,
  type BoardDraftData,
} from "../lib/boardDraft";

type Draft = BoardDraftData;
const blank: Draft = {
  name: "",
  date: "",
  headline: "",
  intro: "",
  whatsapp: "",
  transferBankName: "",
  transferAccountNumber: "",
  transferAccountName: "",
  photos: [],
  existingPhotoCount: 0,
  items: [],
  theme: "clean",
};
const steps = [
  "Birthday details",
  "Photos",
  "Wishlist",
  "Design",
  "Preview",
  "Publish",
];
export function BoardEditorPage() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(blank);
  const [plan, setPlan] = useState<"free" | "pro">("free");
  const [loading, setLoading] = useState(true);
  const [draftReady, setDraftReady] = useState(false);
  const [restored, setRestored] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [proFeature, setProFeature] = useState<string | null>(null);
  const [published, setPublished] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  useEffect(() => {
    void api.entitlement().then(setPlan).catch(() => setPlan("free"));
    let active = true;
    async function hydrate() {
      try {
        if (id) {
          const { page, photos, items } = await api.birthdayPageForEdit(id);
          if (!active) return;
          setDraft({
            name: page.celebrant_name,
            date: page.birthday_date,
            headline: page.headline,
            intro: page.introduction ?? "",
            whatsapp: (page.whatsapp_number ?? "").replace(/^(\+?234|0)/, ""),
            transferBankName: page.transfer_bank_name ?? "",
            transferAccountNumber: page.transfer_account_number ?? "",
            transferAccountName: page.transfer_account_name ?? "",
            photos: [],
            existingPhotoCount: photos.length,
            items: items.map((item) => ({
              name: item.name,
              price: item.price == null ? "" : String(item.price),
              url: item.purchase_url ?? "",
              description: item.description ?? "",
              availableAnywhere: item.available_anywhere ?? true,
              availabilityNote: item.availability_note ?? "",
            })),
            theme: page.theme_key,
          });
        } else {
          const saved = await loadBoardDraft().catch(() => undefined);
          if (!active) return;
          if (saved) {
            setDraft({ ...blank, ...saved.draft });
            setStep(Math.min(5, Math.max(0, saved.step)));
            setRestored(true);
          }
        }
      } catch (loadError) {
        if (!active) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Birthday Page could not be loaded",
        );
      } finally {
        if (active) {
          setDraftReady(true);
          setLoading(false);
        }
      }
    }
    void hydrate();
    return () => {
      active = false;
    };
  }, [id]);
  useEffect(() => {
    if (id || !draftReady) return;
    const hasWork =
      step > 0 ||
      Boolean(
        draft.name ||
          draft.date ||
          draft.headline ||
          draft.intro ||
          draft.whatsapp ||
          draft.transferBankName ||
          draft.transferAccountNumber ||
          draft.transferAccountName ||
          draft.photos.length ||
          draft.items.length,
      );
    if (!hasWork) return;
    const timer = window.setTimeout(() => {
      setDraftSaved(false);
      void saveBoardDraft(draft, step)
        .then(() => setDraftSaved(true))
        .catch(() => setDraftSaved(false));
    }, 400);
    return () => window.clearTimeout(timer);
  }, [draft, draftReady, id, step]);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const next = async () => {
    if (step < 5) return setStep(step + 1);
    setBusy(true);
    setError("");
    try {
      if (id) {
        const { slug } = await api.updateBirthdayPage(id, draft);
        setPublished(true);
        setTimeout(() => navigate(`/b/${slug}`), 1200);
        return;
      }
      const page = await api.publishBirthdayPage(draft);
      await clearBoardDraft().catch(() => undefined);
      setPublished(true);
      setTimeout(() => navigate(`/b/${page.slug}`), 1400);
    } catch (publishError) {
      setError(
        publishError instanceof Error
          ? publishError.message
          : "We could not publish your Birthday Page. Your work is still here.",
      );
    } finally {
      setBusy(false);
    }
  };
  async function startProCheckout() {
    setBusy(true);
    setError("");
    try {
      if (!id) await saveBoardDraft(draft, step).catch(() => undefined);
      const result = await api.initializePaystack();
      location.assign(result.authorization_url);
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Payment could not start",
      );
      setProFeature(null);
    } finally {
      setBusy(false);
    }
  }
  if (loading)
    return (
      <Page className="editor-page">
        <main className="route-loading">Loading your Birthday Page…</main>
      </Page>
    );
  return (
    <Page className="editor-page">
      <header className="editor-nav">
        <Logo />
        <span>
          {isEditing ? "Edit Birthday Page" : "Create My Birthday Page"}
          {!isEditing && draftSaved && <small>Saved on this device</small>}
        </span>
        <Link to="/app">
          <ArrowLeft /> Exit editor
        </Link>
      </header>
      <div className="editor-layout birthday-editor">
        <aside>
          <ol>
            {steps.map((name, index) => (
              <li
                className={
                  index === step ? "active" : index < step ? "complete" : ""
                }
                key={name}
              >
                <span>{index < step ? <Check /> : index + 1}</span>
                <div>
                  <small>Step {index + 1}</small>
                  <strong>{name}</strong>
                </div>
              </li>
            ))}
          </ol>
          <div className="editor-tip">
            <Sparkle />
            <strong>Keep it simple</strong>
            <p>Optional sections can be skipped and changed later.</p>
          </div>
        </aside>
        <main>
          <div className="editor-progress">
            <i style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              className="editor-step"
              key={step}
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -18 }}
            >
              {step === 0 && <Details draft={draft} set={set} />}{" "}
              {step === 1 && (
                <Photos
                  draft={draft}
                  set={set}
                  plan={plan}
                  isEditing={isEditing}
                />
              )}{" "}
              {step === 2 && <Wishlist draft={draft} set={set} />}{" "}
              {step === 3 && (
                <Design
                  draft={draft}
                  set={set}
                  plan={plan}
                  onProSelect={setProFeature}
                />
              )}{" "}
              {step === 4 && <Preview draft={draft} />}{" "}
              {step === 5 && <Publish draft={draft} />}
              <div className="editor-actions">
                {step > 0 ? (
                  <Button variant="secondary" onClick={() => setStep(step - 1)}>
                    <ArrowLeft /> Back
                  </Button>
                ) : (
                  <span />
                )}
                <div>
                  {step > 0 && step < 5 && (
                    <button
                      className="skip-step"
                      onClick={() => setStep(step + 1)}
                    >
                      Skip for now
                    </button>
                  )}
                  <Button onClick={next} disabled={busy}>
                    {busy
                      ? "Publishing..."
                      : step === 5
                        ? isEditing
                          ? "Save Birthday Page"
                          : "Publish Birthday Page"
                        : "Continue"}{" "}
                    <ArrowRight />
                  </Button>
                </div>
              </div>
              {error && <div className="form-error editor-error">{error}</div>}
            </motion.div>
          </AnimatePresence>
        </main>
        <LivePhone draft={draft} />
      </div>
      <CelebrationBurst active={published} />
      {restored && (
        <Toast
          message="Your unfinished Birthday Page is ready."
          onClose={() => setRestored(false)}
        />
      )}
      <Dialog
        open={Boolean(proFeature)}
        title={`${proFeature ?? "This style"} is included with Pro`}
        description="Keep everything you have entered and unlock this feature without leaving the creation flow."
        onClose={() => setProFeature(null)}
        className="pro-feature-dialog"
      >
        <div className="pro-modal-price">
          <Crown weight="fill" />
          <div>
            <strong>₦2,000 once</strong>
            <span>One payment. No monthly subscription.</span>
          </div>
        </div>
        <ul className="pro-modal-benefits">
          <li><Check /> Premium themes and custom colours</li>
          <li><Check /> More photos and unlimited wishlist items</li>
          <li><Check /> Unlimited pages, custom link, and analytics</li>
        </ul>
        <div className="pro-modal-actions">
          <Button variant="secondary" onClick={() => setProFeature(null)}>
            Keep designing
          </Button>
          <Button onClick={startProCheckout} disabled={busy}>
            <CreditCard /> {busy ? "Opening Paystack..." : "Unlock Pro"}
          </Button>
        </div>
      </Dialog>
    </Page>
  );
}
type Props = {
  draft: Draft;
  set: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
};
function Details({ draft, set }: Props) {
  return (
    <>
      <span className="step-count">Birthday details</span>
      <h1>Let’s make this birthday yours.</h1>
      <p>Only the essentials. You can polish everything later.</p>
      <div className="editor-form">
        <Field label="Celebrant name">
          <input
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="What should friends call you?"
            required
          />
        </Field>
        <Field label="Birthday date">
          <DatePicker
            label="Birthday date"
            value={draft.date}
            onChange={(value) => set("date", value)}
          />
        </Field>
        <Field label="Birthday headline">
          <input
            value={draft.headline}
            onChange={(e) => set("headline", e.target.value)}
            placeholder="Make your birthday feel like your day"
            maxLength={120}
          />
        </Field>
        <Field label="Short introduction">
          <textarea
            value={draft.intro}
            onChange={(e) => set("intro", e.target.value)}
            placeholder="A short note for everyone visiting your page"
            maxLength={600}
          />
          <small>{600 - draft.intro.length} characters remaining</small>
        </Field>
        <Field
          label="WhatsApp number"
          hint={
            draft.whatsapp
              ? `Saved securely as ${normalizePhone(draft.whatsapp)}`
              : "We use this only for gift coordination."
          }
        >
          <div className="phone-field">
            <span>+234</span>
            <input
              inputMode="tel"
              value={draft.whatsapp}
              onChange={(e) => set("whatsapp", e.target.value)}
              placeholder="801 234 5678"
            />
          </div>
        </Field>
        <fieldset className="transfer-details">
          <legend>Transfer details</legend>
          <p>Optional. Add this if people may send birthday money directly.</p>
          <Field label="Bank name">
            <input
              value={draft.transferBankName}
              onChange={(e) => set("transferBankName", e.target.value)}
              placeholder="GTBank"
            />
          </Field>
          <Field label="Account number">
            <input
              value={draft.transferAccountNumber}
              onChange={(e) => set("transferAccountNumber", e.target.value)}
              inputMode="numeric"
              placeholder="0123456789"
            />
          </Field>
          <Field label="Account name">
            <input
              value={draft.transferAccountName}
              onChange={(e) => set("transferAccountName", e.target.value)}
              placeholder="Amani Kanu"
            />
          </Field>
        </fieldset>
      </div>
    </>
  );
}
function Photos({
  draft,
  set,
  plan,
  isEditing,
}: Props & { plan: "free" | "pro"; isEditing: boolean }) {
  return (
    <>
      <span className="step-count">Birthday photos</span>
      <h1>Choose the photos that feel like you.</h1>
      <p>
        The first photo becomes your cover. Use the frame control on any photo
        to position your face.
      </p>
      {isEditing && (
        <div className="preview-summary" style={{ marginBottom: "16px" }}>
          <Image />
          <div>
            <strong>{draft.existingPhotoCount} existing photos are preserved</strong>
            <p>
              Your existing gallery is safe. You can add new photos below.
            </p>
          </div>
        </div>
      )}
      <PhotoUploader
        files={draft.photos}
        onChange={(files) => set("photos", files)}
        max={plan === "pro" ? 15 : 5}
      />
      <div className="limit-note">
        <Image />
        <span>
          Free pages include up to 5 optimized photos. Pro includes up to 15.
        </span>
      </div>
    </>
  );
}
function Wishlist({ draft, set }: Props) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [availableAnywhere, setAvailableAnywhere] = useState(true);
  const [availabilityNote, setAvailabilityNote] = useState("");
  const add = () => {
    if (!name) return;
    set("items", [
      ...draft.items,
      { name, price, url, description, availableAnywhere, availabilityNote },
    ]);
    setName("");
    setPrice("");
    setUrl("");
    setDescription("");
    setAvailableAnywhere(true);
    setAvailabilityNote("");
  };
  return (
    <>
      <span className="step-count">Your wishlist</span>
      <h1>What would make the day even better?</h1>
      <p>
        Add thoughtful gift ideas, purchase links, or availability details for friends.
      </p>
      <div className="quick-item">
        <Field label="Item name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Something you would genuinely love"
          />
        </Field>
        <Field label="Price (optional)">
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputMode="numeric"
            placeholder="₦0"
          />
        </Field>
        <Field label="Description (optional)">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Color, brand or specific details"
          />
        </Field>
        <Field label="Purchase link (optional)">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            inputMode="url"
            placeholder="https://"
          />
        </Field>
        <Field label="Availability note (optional)" hint="e.g. Size 44. Black only. Available from Jumia or Apple stores.">
          <input
            value={availabilityNote}
            onChange={(e) => setAvailabilityNote(e.target.value)}
            placeholder="Where to buy or preferences"
          />
        </Field>
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={availableAnywhere}
            onChange={(e) => setAvailableAnywhere(e.target.checked)}
          />
          <span>Available anywhere / can be purchased offline</span>
        </label>
        <Button variant="secondary" onClick={add}>
          <Plus /> Add item
        </Button>
      </div>
      {draft.items.length > 0 && (
        <div className="draft-items">
          {draft.items.map((item, index) => (
            <div key={index}>
              <Gift />
              <span>
                <strong>{item.name}</strong>
                <small>
                  {item.price &&
                    `₦${Number(item.price).toLocaleString("en-NG")} `}
                  {item.availabilityNote && `· ${item.availabilityNote}`}
                </small>
              </span>
              <button
                onClick={() =>
                  set(
                    "items",
                    draft.items.filter((_, i) => i !== index),
                  )
                }
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
function Design({
  draft,
  set,
  plan,
  onProSelect,
}: Props & {
  plan: "free" | "pro";
  onProSelect: (feature: string) => void;
}) {
  return (
    <>
      <span className="step-count">Choose your style</span>
      <h1>Personal, never novelty.</h1>
      <p>
        Every theme is designed to keep your photos and words at the center.
      </p>
      <div className="birthday-themes">
        {[
          ["clean", "Clean", "Free"],
          ["editorial", "Editorial", "Free"],
          ["soft", "Soft", "Free"],
          ["luxe", "Luxe", "Free"],   // 🎉 LAUNCH MODE: unlocked
          ["bold", "Bold", "Free"],   // 🎉 LAUNCH MODE: unlocked
          ["romantic", "Romantic", "Free"], // 🎉 LAUNCH MODE: unlocked
        ].map(([key, name, tier]) => (
          <button
            className={draft.theme === key ? "selected" : ""}
            onClick={() => {
              // 🎉 LAUNCH MODE: all themes free.
              // Restore Pro check: if (tier === "Pro" && plan !== "pro") { onProSelect(`${name} theme`); return; }
              set("theme", key);
            }}
            key={key}
          >
            <i className={key} />
            <span>
              <strong>{name}</strong>
              <small>{tier}</small>
            </span>
            <Check />
          </button>
        ))}
      </div>
    </>
  );
}
function Preview({ draft }: { draft: Draft }) {
  return (
    <>
      <span className="step-count">Preview</span>
      <h1>See it before everyone else.</h1>
      <p>
        This is how your birthday page will open from WhatsApp and social links.
      </p>
      <div className="preview-summary">
        <Check />
        <div>
          <strong>Private by default</strong>
          <p>
            Your Birthday Page uses noindex and only people with the link can
            intentionally discover it.
          </p>
        </div>
      </div>
      <PreviewFacts draft={draft} />
    </>
  );
}
function Publish({ draft }: { draft: Draft }) {
  return (
    <>
      <span className="step-count">Ready to publish</span>
      <h1>Your birthday link is almost here.</h1>
      <p>
        Publishing creates a unique share link. You can update the page any
        time.
      </p>
      <PreviewFacts draft={draft} />
      <div className="publish-actions">
        <span>
          <WhatsappLogo /> Built for WhatsApp sharing
        </span>
        <span>
          <Lock /> Wishlist protected until a wish is submitted
        </span>
      </div>
    </>
  );
}
function PreviewFacts({ draft }: { draft: Draft }) {
  return (
      <div className="preview-facts">
        <div>
          <strong>{draft.photos.length}</strong>
          <span>Photos</span>
        </div>
        <div>
          <strong>{draft.items.length}</strong>
          <span>Wishlist items</span>
        </div>
        <div>
          <strong>
            {draft.transferBankName &&
            draft.transferAccountNumber &&
            draft.transferAccountName
              ? "Set"
              : "Optional"}
          </strong>
          <span>Transfer details</span>
        </div>
        <div>
          <strong>{draft.theme}</strong>
          <span>Theme</span>
        </div>
    </div>
  );
}
function LivePhone({ draft }: { draft: Draft }) {
  const cover = draft.photos[0];
  return (
    <aside className="board-preview">
      <div className="preview-label">
        <Eye /> Live preview
      </div>
      <div className={`preview-phone birthday-phone ${draft.theme}`}>
        <div className="preview-cover">
          {cover ? (
            <PreviewImage file={cover} />
          ) : (
            <b>{draft.name[0] || "H"}</b>
          )}
        </div>
        <div className="preview-body">
          <span>Celebrating</span>
          <h2>{draft.name || "Celebrant name"}</h2>
          <h3>{draft.headline || "Your birthday headline"}</h3>
          <p>{draft.intro || "Your personal introduction will appear here."}</p>
          <Button>Leave a Birthday Wish</Button>
        </div>
      </div>
    </aside>
  );
}

function PreviewImage({ file }: { file: File }) {
  const source = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(source), [source]);
  return <img src={source} alt="Birthday cover preview" />;
}
