import { useState } from "react";
import {
  ArrowLeft,
  Check,
  CreditCard,
  Crown,
  Upload,
} from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import {
  Button,
  DatePicker,
  Field,
  Logo,
  Page,
  PhotoUploader,
} from "../components/ui";

export function UpgradePage() {
  const businessBank = {
    bank: import.meta.env.VITE_BUSINESS_BANK_NAME,
    number: import.meta.env.VITE_BUSINESS_ACCOUNT_NUMBER,
    name: import.meta.env.VITE_BUSINESS_ACCOUNT_NAME,
  };
  const manualConfigured = Object.values(businessBank).every(Boolean);
  const [manual, setManual] = useState(false);
  const [receipt, setReceipt] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    sender_name: "",
    transfer_date: "",
    transaction_reference: "",
    note: "",
  });
  async function pay() {
    setBusy(true);
    setError("");
    try {
      const result = await api.initializePaystack();
      location.assign(result.authorization_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment could not start");
    } finally {
      setBusy(false);
    }
  }
  async function submitManual(event: React.FormEvent) {
    event.preventDefault();
    if (!form.sender_name.trim() || !form.transfer_date || !receipt[0]) {
      setError("Add the sender name, transfer date, and receipt.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.submitManualPayment({ ...form, receipt: receipt[0] });
      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Payment proof could not be submitted",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page className="upgrade-page">
      <header className="editor-nav">
        <Logo />
        <span>Huraay Pro</span>
        <Link to="/app">
          <ArrowLeft /> Back to dashboard
        </Link>
      </header>
      <main className="upgrade-wrap">
        <section className="upgrade-offer">
          <Crown />
          <span>Huraay Pro</span>
          <h1>More room to make every birthday yours.</h1>
          <div className="pro-price">
            <strong>₦2,000</strong>
            <span>once</span>
          </div>
          <p>One payment. No monthly subscription.</p>
          <ul>
            {[
              "Unlimited Birthday Pages",
              "Up to 15 photos per page",
              "Unlimited wishlist items",
              "Premium themes and custom colors",
              "Vanity URL and custom sharing card",
              "Page, wish, and gift analytics",
              "Pin favourite wishes",
              "Remove Huraay branding",
            ].map((item) => (
              <li key={item}>
                <Check />
                {item}
              </li>
            ))}
          </ul>
          <Button onClick={pay} disabled={busy}>
            <CreditCard />
            {busy ? "Opening Paystack..." : "Pay with Paystack"}
          </Button>
          <button className="manual-link" onClick={() => setManual(!manual)}>
            Pay by Nigerian bank transfer instead
          </button>
          {error && <div className="form-error">{error}</div>}
        </section>
        {manual && (
          <section className="manual-payment">
            <span>Manual transfer</span>
            <h2>Transfer exactly ₦2,000</h2>
            <p>
              Uploading a receipt does not activate Pro automatically. Our team
              will review the transfer first.
            </p>
            <div className="business-bank">
              <small>Huraay business account</small>
              {manualConfigured ? (
                <>
                  <strong>{businessBank.bank}</strong>
                  <span>{businessBank.number}</span>
                  <span>{businessBank.name}</span>
                </>
              ) : (
                <strong>Manual transfer is not configured yet.</strong>
              )}
            </div>
            {!manualConfigured ? (
              <div className="form-error">
                Use Paystack for now, or ask the Huraay administrator for payment details.
              </div>
            ) : submitted ? (
              <div className="payment-submitted">
                <Check />
                <h3>Payment proof received</h3>
                <p>
                  Your transfer is pending review. Pro will activate only after
                  an administrator confirms it.
                </p>
              </div>
            ) : (
              <form className="editor-form" onSubmit={submitManual}>
                <Field label="Sender name">
                  <input
                    value={form.sender_name}
                    onChange={(e) =>
                      setForm({ ...form, sender_name: e.target.value })
                    }
                    required
                  />
                </Field>
                <Field label="Transfer date">
                  <DatePicker
                    label="Transfer date"
                    value={form.transfer_date}
                    onChange={(value) =>
                      setForm({ ...form, transfer_date: value })
                    }
                  />
                </Field>
                <Field label="Transaction reference">
                  <input
                    value={form.transaction_reference}
                    onChange={(e) =>
                      setForm({ ...form, transaction_reference: e.target.value })
                    }
                  />
                </Field>
                <Field label="Receipt">
                  <PhotoUploader
                    files={receipt}
                    onChange={setReceipt}
                    max={1}
                  />
                </Field>
                <Field label="Optional note">
                  <textarea
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                  />
                </Field>
                <Button disabled={busy}>
                  <Upload /> {busy ? "Submitting…" : "Submit for review"}
                </Button>
              </form>
            )}
          </section>
        )}
      </main>
    </Page>
  );
}
