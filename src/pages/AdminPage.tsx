import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Clock,
  MagnifyingGlass,
  ShieldCheck,
  X,
} from "@phosphor-icons/react";
import { Button, Empty, Logo, Page, Skeleton, Toast } from "../components/ui";
import { api } from "../lib/api";

type Submission = {
  id: string;
  sender_name: string;
  transfer_date: string;
  transaction_reference: string;
  receipt_url: string | null;
  note: string | null;
  status: "submitted" | "under_review" | "approved" | "rejected" | "more_information_required";
  decision_reason: string | null;
  created_at: string;
  payment: { amount_kobo: number; currency: string; reference: string; status: string } | null;
  profile: { full_name: string | null; display_name: string | null } | null;
};

export function AdminPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Submission | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  useEffect(() => {
    api.adminPayments()
      .then(({ submissions: rows }) => setSubmissions(rows as Submission[]))
      .catch((error) => setToast(error.message))
      .finally(() => setLoading(false));
  }, []);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return submissions;
    return submissions.filter((row) =>
      [row.sender_name, row.transaction_reference, row.payment?.reference, row.profile?.full_name, row.profile?.display_name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [query, submissions]);
  const decide = async (decision: "approved" | "rejected" | "more_information_required") => {
    if (!selected) return;
    if (decision !== "approved" && !reason.trim()) {
      setToast("Add a clear reason before continuing");
      return;
    }
    setBusy(true);
    try {
      await api.reviewManualPayment({ submission_id: selected.id, decision, reason: reason.trim() || undefined });
      setSubmissions((current) => current.map((row) => row.id === selected.id ? { ...row, status: decision, decision_reason: reason.trim() || null } : row));
      setSelected(null);
      setReason("");
      setToast(decision === "approved" ? "Payment approved and Pro activated" : "Payment review saved");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Review could not be saved");
    } finally { setBusy(false); }
  };
  return (
    <Page className="admin-page">
      <aside><Logo /><nav><button className="active"><Clock /> Payment queue</button><button><ShieldCheck /> Audit protected</button></nav></aside>
      <main>
        <header><div><span>Internal operations</span><h1>Manual payments</h1></div><div className="admin-search"><MagnifyingGlass /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search payments" /></div></header>
        <section className="admin-stats">
          <div><strong>{submissions.filter((row) => row.status === "submitted").length}</strong><span>Submitted</span></div>
          <div><strong>{submissions.filter((row) => row.status === "under_review").length}</strong><span>Under review</span></div>
          <div><strong>{submissions.filter((row) => row.status === "more_information_required").length}</strong><span>Needs information</span></div>
        </section>
        {loading ? <Skeleton rows={5} /> : filtered.length ? (
          <section className="owner-page-list">
            {filtered.map((row) => <article className="surface owner-page-card" key={row.id}><div><span className={`status-badge ${row.status}`}>{row.status.replaceAll("_", " ")}</span><h2>{row.sender_name}</h2><p>{row.profile?.full_name || row.profile?.display_name || "Huraay user"} · {new Intl.NumberFormat("en-NG", { style: "currency", currency: row.payment?.currency || "NGN" }).format((row.payment?.amount_kobo || 0) / 100)}</p><small>{new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(row.created_at))}</small></div><Button variant="secondary" onClick={() => { setSelected(row); setReason(row.decision_reason || ""); }}>Review</Button></article>)}
          </section>
        ) : <section className="surface"><Empty icon={<ShieldCheck />} title="No payments need review" copy="New manual payment submissions will appear here with receipts and expected amounts." /></section>}
        {selected && <section className="surface settings-form"><span className="status-badge">Payment review</span><h2>{selected.sender_name}</h2><p>Transfer date: {new Intl.DateTimeFormat("en-NG", { dateStyle: "long" }).format(new Date(`${selected.transfer_date}T12:00:00`))}</p><p>Reference: {selected.transaction_reference || "Not supplied"}</p>{selected.note && <p>Note: {selected.note}</p>}{selected.receipt_url && <a className="button secondary" href={selected.receipt_url} target="_blank" rel="noreferrer">Open private receipt</a>}<label>Decision note<textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Required when rejecting or requesting another receipt" maxLength={500} /></label><div className="form-actions"><Button variant="secondary" onClick={() => setSelected(null)}>Cancel</Button><Button variant="danger" disabled={busy} onClick={() => void decide("rejected")}><X /> Reject</Button><Button variant="secondary" disabled={busy} onClick={() => void decide("more_information_required")}>Request receipt</Button><Button disabled={busy} onClick={() => void decide("approved")}><Check /> Approve</Button></div></section>}
      </main>
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </Page>
  );
}
