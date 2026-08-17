import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  CalendarBlank,
  Camera,
  CaretDown,
  CaretLeft,
  CaretRight,
  Check,
  Crop,
  Upload,
  Trash,
  X,
} from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import fullLogo from "../../Huraay Full Logo.png";
import { compressImage, frameImage } from "../lib/media";

export function Logo() {
  return (
    <Link to="/" className="logo" aria-label="Huraay home">
      <img src={fullLogo} alt="Huraay" />
    </Link>
  );
}
export function Button({
  children,
  variant = "primary",
  type = "button",
  disabled,
  onClick,
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      whileTap={reduce ? undefined : { scale: 0.98 }}
      className={`button ${variant}`}
      type={type}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </motion.button>
  );
}
export function Page({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? undefined : { opacity: 0, y: -6 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function Dialog({
  open,
  title,
  description,
  onClose,
  children,
  className = "",
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const closeButton = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    const handleDialogKeys = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
      if (event.key !== "Tab" || !dialog.current) return;
      const focusable = Array.from(
        dialog.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleDialogKeys);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleDialogKeys);
    };
  }, [open]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-backdrop"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? undefined : { opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onCloseRef.current();
          }}
        >
          <motion.section
            ref={dialog}
            className={`modal ${className}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            initial={reduce ? false : { opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: 10, scale: 0.98 }}
            transition={
              reduce
                ? { duration: 0 }
                : { duration: 0.2, ease: [0.22, 1, 0.36, 1] }
            }
          >
            <button
              ref={closeButton}
              className="modal-close"
              type="button"
              onClick={() => onCloseRef.current()}
              aria-label="Close dialog"
            >
              <X />
            </button>
            <header className="modal-heading">
              <h2 id={titleId}>{title}</h2>
              {description && <p id={descriptionId}>{description}</p>}
            </header>
            {children}
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
export function Toast({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      <motion.div
        className="toast"
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12 }}
      >
        <Check weight="bold" />
        <span>{message}</span>
        <button onClick={onClose}>
          <X />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
export function Empty({
  icon,
  title,
  copy,
  action,
}: {
  icon: ReactNode;
  title: string;
  copy: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div>{icon}</div>
      <h3>{title}</h3>
      <p>{copy}</p>
      {action}
    </div>
  );
}
export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="skeleton-list">
      {Array.from({ length: rows }).map((_, i) => (
        <div className="skeleton" key={i}>
          <i />
          <span>
            <b />
            <b />
          </span>
        </div>
      ))}
    </div>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export type SelectOption = {
  value: string;
  label: string;
  description?: string;
};
export function Select({
  value,
  options,
  onChange,
  placeholder = "Choose an option",
  disabled = false,
  label,
}: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(
    Math.max(
      0,
      options.findIndex((option) => option.value === value),
    ),
  );
  const root = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  function keyDown(event: React.KeyboardEvent) {
    if (["ArrowDown", "ArrowUp"].includes(event.key)) {
      event.preventDefault();
      setOpen(true);
      setActive((current) =>
        event.key === "ArrowDown"
          ? Math.min(options.length - 1, current + 1)
          : Math.max(0, current - 1),
      );
    }
    if (event.key === "Enter" && open) {
      event.preventDefault();
      onChange(options[active].value);
      setOpen(false);
    }
    if (event.key === "Escape") setOpen(false);
  }
  return (
    <div className={`h-select ${open ? "open" : ""}`} ref={root}>
      <button
        type="button"
        className="h-select-trigger"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={keyDown}
      >
        <span className={selected ? "" : "placeholder"}>
          {selected?.label ?? placeholder}
        </span>
        <CaretDown />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="h-select-menu"
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.18 }}
          >
            {options.map((option, index) => (
              <button
                type="button"
                role="option"
                aria-selected={value === option.value}
                className={index === active ? "active" : ""}
                key={option.value}
                onMouseEnter={() => setActive(index)}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <span>
                  <strong>{option.label}</strong>
                  {option.description && <small>{option.description}</small>}
                </span>
                {value === option.value && <Check />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const week = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function DatePicker({
  value,
  onChange,
  placeholder = "Choose a date",
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}) {
  const selected = value ? new Date(`${value}T12:00:00`) : null;
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(selected ?? new Date());
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  const days: (Date | null)[] = useMemo(() => {
    const year = view.getFullYear(),
      month = view.getMonth();
    const offset = (new Date(year, month, 1).getDay() + 6) % 7;
    const count = new Date(year, month + 1, 0).getDate();
    return [
      ...Array<null>(offset).fill(null),
      ...Array.from(
        { length: count },
        (_, index) => new Date(year, month, index + 1),
      ),
    ];
  }, [view]);
  const moveMonth = (amount: number) =>
    setView(new Date(view.getFullYear(), view.getMonth() + amount, 1));
  return (
    <div className={`h-date ${open ? "open" : ""}`} ref={root}>
      <button
        type="button"
        className="h-date-trigger"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <CalendarBlank />
        <span className={selected ? "" : "placeholder"}>
          {selected
            ? new Intl.DateTimeFormat("en-NG", {
                day: "numeric",
                month: "long",
                year: "numeric",
              }).format(selected)
            : placeholder}
        </span>
        <CaretDown />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="h-calendar"
            role="dialog"
            aria-label={label ?? "Choose a date"}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <header>
              <button
                type="button"
                onClick={() => moveMonth(-1)}
                aria-label="Previous month"
              >
                <CaretLeft />
              </button>
              <strong>
                {new Intl.DateTimeFormat("en-NG", {
                  month: "long",
                  year: "numeric",
                }).format(view)}
              </strong>
              <button
                type="button"
                onClick={() => moveMonth(1)}
                aria-label="Next month"
              >
                <CaretRight />
              </button>
            </header>
            <div className="h-calendar-week">
              {week.map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="h-calendar-grid">
              {days.map((day, index) =>
                day ? (
                  <button
                    type="button"
                    key={isoDate(day)}
                    className={`${value === isoDate(day) ? "selected" : ""} ${isoDate(day) === isoDate(new Date()) ? "today" : ""}`}
                    aria-label={new Intl.DateTimeFormat("en-NG", {
                      dateStyle: "full",
                    }).format(day)}
                    aria-pressed={value === isoDate(day)}
                    onClick={() => {
                      onChange(isoDate(day));
                      setOpen(false);
                    }}
                  >
                    {day.getDate()}
                  </button>
                ) : (
                  <span key={`empty-${index}`} />
                ),
              )}
            </div>
            <footer>
              <button
                type="button"
                onClick={() => {
                  const today = new Date();
                  onChange(isoDate(today));
                  setView(today);
                  setOpen(false);
                }}
              >
                Today
              </button>
              {value && (
                <button
                  type="button"
                  onClick={() => {
                    onChange("");
                    setOpen(false);
                  }}
                >
                  Clear
                </button>
              )}
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
export const nextIcon = <ArrowRight weight="bold" />;

export function ReceiptUploader({
  file,
  onChange,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const [error, setError] = useState("");
  async function add(selected: FileList | null) {
    if (!selected?.[0]) return;
    setError("");
    const next = selected[0];
    if (
      !next.type.startsWith("image/") &&
      next.type !== "application/pdf"
    ) {
      setError("Choose an image or PDF receipt");
      return;
    }
    if (next.size > 8 * 1024 * 1024) {
      setError("Receipt must be smaller than 8 MB");
      return;
    }
    onChange(next);
  }
  return (
    <div className="receipt-uploader">
      <label>
        <Upload />
        <strong>Upload transfer receipt</strong>
        <span>Image or PDF · one file</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={(event) => add(event.target.files)}
        />
      </label>
      {error && <div className="form-error">{error}</div>}
      {file && (
        <div className="receipt-preview">
          {file.type.startsWith("image/") ? (
            <FileImage file={file} alt="Receipt preview" />
          ) : (
            <div className="receipt-preview-pdf">
              <Upload />
              <strong>PDF receipt</strong>
            </div>
          )}
          <div>
            <strong>{file.name}</strong>
            <small>{Math.ceil(file.size / 1024)} KB</small>
          </div>
          <button type="button" onClick={() => onChange(null)}>
            <X />
          </button>
        </div>
      )}
    </div>
  );
}

export function PhotoUploader({
  files,
  onChange,
  max = 5,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  max?: number;
}) {
  const [error, setError] = useState("");
  const [framing, setFraming] = useState<number | null>(null);
  const [frame, setFrame] = useState({ x: 50, y: 50, zoom: 1 });
  const [savingFrame, setSavingFrame] = useState(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    frame: { x: number; y: number };
  } | null>(null);
  async function add(list: FileList | null) {
    if (!list) return;
    setError("");
    try {
      const room = Math.max(0, max - files.length);
      const optimized = await Promise.all(
        Array.from(list)
          .slice(0, room)
          .map((file) => compressImage(file)),
      );
      onChange([...files, ...optimized]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add photo");
    }
  }
  async function applyFrame() {
    if (framing == null || !files[framing]) return;
    setSavingFrame(true);
    setError("");
    try {
      const framed = await frameImage(files[framing], frame);
      onChange(files.map((file, index) => (index === framing ? framed : file)));
      setFraming(null);
      setFrame({ x: 50, y: 50, zoom: 1 });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not frame photo");
    } finally {
      setSavingFrame(false);
    }
  }
  function clamp(value: number) {
    return Math.min(100, Math.max(0, value));
  }
  function updateFrameFromPointer(event: React.PointerEvent<HTMLDivElement>) {
    const viewport = viewportRef.current;
    const drag = dragRef.current;
    if (!viewport || !drag) return;
    const rect = viewport.getBoundingClientRect();
    const nextX =
      drag.frame.x + ((event.clientX - drag.startX) / Math.max(1, rect.width)) * 100;
    const nextY =
      drag.frame.y + ((event.clientY - drag.startY) / Math.max(1, rect.height)) * 100;
    setFrame((current) => ({
      ...current,
      x: clamp(nextX),
      y: clamp(nextY),
    }));
  }
  return (
    <div className="photo-uploader">
      <label>
        <Camera />
        <strong>Tap to add birthday photos</strong>
        <span>
          Camera or gallery · {files.length} of {max}
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(e) => add(e.target.files)}
        />
      </label>
      {error && <div className="form-error">{error}</div>}
      {files.length > 0 && (
        <div className="upload-previews">
          {files.map((file, index) => (
            <figure key={`${file.name}-${index}`}>
              <FileImage file={file} alt={`Upload ${index + 1}`} />
              {index === 0 && <span>Cover</span>}
              <div className="upload-preview-actions">
                <button
                  type="button"
                  onClick={() => {
                    setFrame({ x: 50, y: 50, zoom: 1 });
                    setFraming(index);
                  }}
                  aria-label={`Adjust photo ${index + 1}`}
                >
                  <Crop />
                </button>
                <button
                  type="button"
                  onClick={() => onChange(files.filter((_, i) => i !== index))}
                  aria-label={`Remove photo ${index + 1}`}
                >
                  <Trash />
                </button>
              </div>
            </figure>
          ))}
        </div>
      )}
      <Dialog
        open={framing != null}
        title="Frame your photo"
        description="Position your face inside the frame. The saved crop becomes part of the uploaded image."
        onClose={() => setFraming(null)}
        className="photo-frame-dialog"
      >
        {framing != null && files[framing] && (
          <>
            <div
              ref={viewportRef}
              className="photo-frame-viewport"
              onPointerDown={(event) => {
                const viewport = viewportRef.current;
                if (!viewport) return;
                event.preventDefault();
                viewport.setPointerCapture(event.pointerId);
                dragRef.current = {
                  pointerId: event.pointerId,
                  startX: event.clientX,
                  startY: event.clientY,
                  frame: { ...frame },
                };
              }}
              onPointerMove={(event) => {
                if (!dragRef.current || dragRef.current.pointerId !== event.pointerId)
                  return;
                updateFrameFromPointer(event);
              }}
              onPointerUp={(event) => {
                if (dragRef.current?.pointerId !== event.pointerId) return;
                dragRef.current = null;
              }}
              onPointerCancel={() => {
                dragRef.current = null;
              }}
            >
              <FileImage
                file={files[framing]}
                alt="Photo framing preview"
                style={{
                  objectPosition: `${frame.x}% ${frame.y}%`,
                  transform: `scale(${frame.zoom})`,
                  transformOrigin: "center center",
                }}
              />
              <span aria-hidden="true" />
              <strong className="photo-frame-hint">Drag or use arrows below</strong>
            </div>
            <div className="photo-frame-arrows">
              <div />
              <button type="button" aria-label="Move up" onClick={() => setFrame((f) => ({ ...f, y: clamp(f.y - 5) }))}>
                ↑
              </button>
              <div />
              <button type="button" aria-label="Move left" onClick={() => setFrame((f) => ({ ...f, x: clamp(f.x - 5) }))}>
                ←
              </button>
              <button type="button" aria-label="Centre" onClick={() => setFrame((f) => ({ ...f, x: 50, y: 50 }))} title="Reset to centre">
                ⊙
              </button>
              <button type="button" aria-label="Move right" onClick={() => setFrame((f) => ({ ...f, x: clamp(f.x + 5) }))}>
                →
              </button>
              <div />
              <button type="button" aria-label="Move down" onClick={() => setFrame((f) => ({ ...f, y: clamp(f.y + 5) }))}>
                ↓
              </button>
              <div />
            </div>
            <div className="photo-frame-controls">
              <Field label="Zoom">
                <input
                  type="range"
                  min="1"
                  max="2.5"
                  step="0.05"
                  value={frame.zoom}
                  onChange={(event) =>
                    setFrame({ ...frame, zoom: Number(event.target.value) })
                  }
                />
              </Field>
              <Field label="Left ↔ Right">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={frame.x}
                  onChange={(event) =>
                    setFrame({ ...frame, x: Number(event.target.value) })
                  }
                />
              </Field>
              <Field label="Up ↕ Down">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={frame.y}
                  onChange={(event) =>
                    setFrame({ ...frame, y: Number(event.target.value) })
                  }
                />
              </Field>
            </div>
            <div className="photo-frame-actions">
              <Button variant="secondary" onClick={() => setFraming(null)}>
                Cancel
              </Button>
              <Button onClick={applyFrame} disabled={savingFrame}>
                <Crop /> {savingFrame ? "Saving frame..." : "Use this frame"}
              </Button>
            </div>
          </>
        )}
      </Dialog>
    </div>
  );
}

function FileImage({
  file,
  alt,
  style,
}: {
  file: File;
  alt: string;
  style?: React.CSSProperties;
}) {
  // Use useState+useEffect instead of useMemo so the object URL lifecycle is
  // correctly sequenced: the cleanup (revokeObjectURL) only fires AFTER the
  // component has unmounted or after the new URL is already in state — preventing
  // the broken-img-until-refresh bug where useMemo could revoke a URL that was
  // still referenced by an img element in the same render cycle.
  const [src, setSrc] = useState("");
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  if (!src) return <span className="img-placeholder" aria-hidden="true" />;
  return <img src={src} alt={alt} style={style} />;
}
