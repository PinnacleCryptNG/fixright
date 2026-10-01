import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type ReactNode } from "react";
import { z } from "zod";
import { ArrowLeft, BadgeCheck, CalendarDays, Check, CreditCard, MapPin, Star, Wrench } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ServiceIcon } from "@/components/service-icon";
import { LocationPicker, type PickedLocation } from "@/components/location-picker";
import { useAppUser } from "@/hooks/use-app-user";
import {
  cancelRepairRequest,
  getRepairRequest,
  initializeRepairPayment,
  listServices,
  submitRepairRequest,
  verifyRepairPayment,
} from "@/lib/fixright.functions";
import { formatNaira, formatSlot, formatTime, todayLocalISO } from "@/lib/format";
import { SERVICE_FEE_NOTE } from "@/lib/config";
import type { AlternativeSlot, BookingView, ServiceRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/book")({
  validateSearch: z.object({ request: z.string().uuid().optional(), reference: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Book a repair — FixRight" },
      { name: "description", content: "Tell us what needs fixing and we'll find an available technician nearby." },
      { property: "og:title", content: "Book a repair — FixRight" },
      { property: "og:description", content: "Request a repair and get matched with a nearby technician." },
    ],
  }),
  component: BookPage,
});

const WINDOWS = [
  { start: "08:00", end: "11:00" },
  { start: "10:00", end: "13:00" },
  { start: "12:00", end: "15:00" },
  { start: "14:00", end: "17:00" },
  { start: "16:00", end: "18:00" },
];

type Draft = {
  service: ServiceRecord | null;
  problem: string;
  brand: string;
  model: string;
  loc: PickedLocation | null;
  landmark: string;
  date: string;
  windowStart: string;
  windowEnd: string;
  custom: boolean;
};

const emptyDraft: Draft = {
  service: null,
  problem: "",
  brand: "",
  model: "",
  loc: null,
  landmark: "",
  date: "",
  windowStart: "",
  windowEnd: "",
  custom: false,
};

const STEPS = ["Service", "Problem", "Location", "Availability", "Review"];
type Phase = "form" | "matching" | "waiting" | "matched" | "payment" | "processing" | "none" | "booked";

function BookPage() {
  const { role, isPending } = useAppUser();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [phase, setPhase] = useState<Phase>("form");
  const [booking, setBooking] = useState<BookingView | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = useServerFn(submitRepairRequest);
  const initPay = useServerFn(initializeRepairPayment);
  const verifyPay = useServerFn(verifyRepairPayment);
  const cancel = useServerFn(cancelRepairRequest);

  const getReq = useServerFn(getRepairRequest);
  const { request: resumeId, reference } = Route.useSearch();
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Resume a request from the dashboard, and poll while technicians decide.
  useEffect(() => {
    if (!resumeId || booking) return;
    const apply = (b: BookingView) => {
      setBooking(b);
      setPhase(b.status === "confirmed" ? "booked" : phaseFor(b));
    };
    if (reference) {
      // Returning from Paystack: always verify server-side before confirming.
      setPhase("processing");
      verifyPay({ data: { requestId: resumeId, reference } })
        .then(apply)
        .catch((e) => {
          setPaymentError(e instanceof Error ? e.message : "We couldn't verify your payment.");
          getReq({ data: { requestId: resumeId } })
            .then((b) => {
              setBooking(b);
              setPhase("payment");
            })
            .catch(() => setPhase("form"));
        });
      return;
    }
    getReq({ data: { requestId: resumeId } })
      .then(apply)
      .catch(() => undefined);
  }, [resumeId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase !== "waiting" || !booking) return;
    const t = setInterval(() => {
      getReq({ data: { requestId: booking.id } })
        .then((b) => {
          setBooking(b);
          setPhase(phaseFor(b));
        })
        .catch(() => undefined);
    }, 5000);
    return () => clearInterval(t);
  }, [phase, booking?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  if (!isPending && role && role !== "customer") {
    return (
      <Frame>
        <h1 className="text-2xl">Booking is for customer accounts</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          You're signed in with a {role} account. Sign in with a customer account to request a repair.
        </p>
      </Frame>
    );
  }

  async function handleSubmit(override?: Partial<Draft>) {
    const d = { ...draft, ...override };
    if (!d.service) return;
    setBusy(true);
    setPhase("matching");
    const started = Date.now();
    try {
      const result = await submit({
        data: {
          serviceId: d.service.id,
          problemDescription: d.problem,
          brand: d.brand || null,
          model: d.model || null,
          address: d.loc!.address,
          state: d.loc!.state,
          lga: d.loc!.lga,
          latitude: d.loc!.latitude,
          longitude: d.loc!.longitude,
          landmark: d.landmark || null,
          date: d.date,
          windowStart: d.windowStart,
          windowEnd: d.windowEnd,
        },
      });
      const wait = Math.max(0, 2200 - (Date.now() - started));
      await new Promise((r) => setTimeout(r, wait));
      setBooking(result);
      setPhase(phaseFor(result));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "We couldn't submit your request.");
      setPhase("form");
    } finally {
      setBusy(false);
    }
  }

  async function handlePay() {
    if (!booking) return;
    setBusy(true);
    setPaymentError(null);
    try {
      const { authorizationUrl } = await initPay({ data: { requestId: booking.id } });
      window.location.href = authorizationUrl;
    } catch (e) {
      setPaymentError(e instanceof Error ? e.message : "We couldn't start the payment. Please try again.");
      setBusy(false);
    }
  }

  async function discardUnconfirmed() {
    if (booking && booking.status !== "confirmed") {
      await cancel({ data: { requestId: booking.id } }).catch(() => undefined);
    }
    setBooking(null);
  }

  async function handleChange(toStep = 4) {
    await discardUnconfirmed();
    setPhase("form");
    setStep(toStep);
  }

  async function handleAlternative(alt: AlternativeSlot) {
    await discardUnconfirmed();
    const patch = { date: alt.date, windowStart: alt.start, windowEnd: alt.end, custom: true };
    update(patch);
    await handleSubmit(patch);
  }

  if (phase === "matching") return <Frame><Matching /></Frame>;
  if (phase === "waiting" && booking) {
    return (
      <Frame>
        <Matching
          title="Waiting for a technician to accept…"
          text={`We've sent your ${booking.service_name ?? "repair"} request to available verified technicians in ${booking.area_name}. This page updates as soon as one accepts. You won't pay anything until then.`}
        />
        <div className="mt-2 flex justify-center">
          <Button variant="outline" onClick={() => handleChange()}>Change Request</Button>
        </div>
      </Frame>
    );
  }
  if (phase === "matched" && booking) {
    return (
      <Frame>
        <MatchedView booking={booking} busy={busy} onConfirm={() => setPhase("payment")} onChange={() => handleChange()} />
      </Frame>
    );
  }
  if (phase === "payment" && booking && booking.technician) {
    return (
      <Frame>
        <PaymentView booking={booking} busy={busy} onPay={handleConfirm} onBack={() => setPhase("matched")} />
      </Frame>
    );
  }
  if (phase === "none" && booking) {
    return (
      <Frame>
        <NoMatchView booking={booking} busy={busy} onAlternative={handleAlternative} onChange={handleChange} />
      </Frame>
    );
  }
  if (phase === "booked" && booking) return <Frame><BookedView booking={booking} /></Frame>;

  return (
    <Frame>
      <Progress step={step} onJump={(i) => i < step && setStep(i)} />
      {step > 0 ? (
        <button
          type="button"
          onClick={() => setStep((s) => s - 1)}
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      ) : null}
      <div key={step} className="rise-in">
        {step === 0 && (
          <StepService
            selected={draft.service}
            onSelect={(service) => {
              update({ service });
              setStep(1);
            }}
          />
        )}
        {step === 1 && <StepProblem draft={draft} update={update} onNext={() => setStep(2)} />}
        {step === 2 && <StepLocation draft={draft} update={update} onNext={() => setStep(3)} />}
        {step === 3 && <StepAvailability draft={draft} update={update} onNext={() => setStep(4)} />}
        {step === 4 && <StepReview draft={draft} onEdit={setStep} busy={busy} onSubmit={() => handleSubmit()} />}
      </div>
    </Frame>
  );
}

/* ---------------------------------------------------------------- layout */

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-xl items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Wrench className="h-3.5 w-3.5" />
            </span>
            FixRight
          </Link>
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            My dashboard
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-5 py-8 sm:py-12">{children}</main>
    </div>
  );
}

function Progress({ step, onJump }: { step: number; onJump: (i: number) => void }) {
  return (
    <div className="mb-8">
      <div className="flex gap-1.5">
        {STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            aria-label={`Step ${i + 1}: ${label}`}
            onClick={() => onJump(i)}
            disabled={i >= step}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              i <= step ? "bg-primary" : "bg-border",
              i < step && "cursor-pointer",
            )}
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Step {step + 1} of {STEPS.length} · {STEPS[step]}
      </p>
    </div>
  );
}

function Field({ label, error, optional, children }: { label: string; error?: string | undefined; optional?: boolean; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">
        {label}
        {optional ? <span className="ml-1 font-normal text-muted-foreground">(optional)</span> : null}
      </span>
      <div className="mt-1.5">{children}</div>
      {error ? <span className="mt-1 block text-xs text-destructive">{error}</span> : null}
    </label>
  );
}

const inputCls =
  "w-full rounded-md border border-input bg-card px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30 aria-[invalid=true]:border-destructive";

/* ----------------------------------------------------------------- steps */

function StepService({ selected, onSelect }: { selected: ServiceRecord | null; onSelect: (s: ServiceRecord) => void }) {
  const fetchServices = useServerFn(listServices);
  const { data, isLoading, error } = useQuery({ queryKey: ["services"], queryFn: () => fetchServices() });

  return (
    <div>
      <h1 className="text-3xl sm:text-4xl">What needs fixing?</h1>
      <p className="mt-2 text-sm text-muted-foreground">Pick the item that needs a technician.</p>
      {error ? <p className="mt-6 text-sm text-destructive">We couldn't load services. Please refresh.</p> : null}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-lg border border-border bg-muted" />
            ))
          : data?.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelect(s)}
                className={cn(
                  "flex h-28 flex-col items-start justify-between rounded-lg border bg-card p-4 text-left shadow-card transition hover:-translate-y-0.5 hover:border-primary",
                  selected?.id === s.id ? "border-primary ring-2 ring-ring/30" : "border-border",
                )}
              >
                <ServiceIcon name={s.name} className="h-6 w-6 text-primary" />
                <span className="text-sm font-medium">{s.name}</span>
              </button>
            ))}
      </div>
    </div>
  );
}

function StepProblem({ draft, update, onNext }: { draft: Draft; update: (p: Partial<Draft>) => void; onNext: () => void }) {
  const [error, setError] = useState<string>();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (draft.problem.trim().length < 10) return setError("Please describe the problem in at least 10 characters.");
        setError(undefined);
        onNext();
      }}
      className="space-y-5"
    >
      <SelectedService service={draft.service} />
      <h1 className="text-3xl sm:text-4xl">Tell us what's wrong</h1>
      <Field label="Describe the problem" error={error}>
        <textarea
          rows={6}
          maxLength={2000}
          aria-invalid={Boolean(error)}
          value={draft.problem}
          onChange={(e) => update({ problem: e.target.value })}
          placeholder="Tell us what's happening. For example: My AC turns on but isn't cooling."
          className={cn(inputCls, "resize-y leading-relaxed")}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Brand" optional>
          <input className={inputCls} maxLength={80} value={draft.brand} onChange={(e) => update({ brand: e.target.value })} />
        </Field>
        <Field label="Model" optional>
          <input className={inputCls} maxLength={80} value={draft.model} onChange={(e) => update({ model: e.target.value })} />
        </Field>
      </div>
      <Button type="submit" size="lg" className="w-full">Continue</Button>
    </form>
  );
}

function StepLocation({ draft, update, onNext }: { draft: Draft; update: (p: Partial<Draft>) => void; onNext: () => void }) {
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!draft.loc) { setError("Please confirm your location to continue."); return; }
        onNext();
      }}
      className="space-y-5"
    >
      <SelectedService service={draft.service} />
      <h1 className="text-3xl sm:text-4xl">Where should the technician come?</h1>
      <LocationPicker value={draft.loc} onConfirm={(loc) => { update({ loc }); setError(null); }} />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Field label="Flat, floor or landmark" optional>
        <input
          className={inputCls}
          maxLength={160}
          placeholder="e.g. Flat 3, opposite the filling station"
          value={draft.landmark}
          onChange={(e) => update({ landmark: e.target.value })}
        />
      </Field>
      <p className="text-xs text-muted-foreground">Your address is only shared with the technician who accepts your request.</p>
      <Button type="submit" size="lg" className="w-full">Continue</Button>
    </form>
  );
}

function StepAvailability({ draft, update, onNext }: { draft: Draft; update: (p: Partial<Draft>) => void; onNext: () => void }) {
  const [errors, setErrors] = useState<{ date?: string; window?: string }>({});
  const today = todayLocalISO();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const next: typeof errors = {};
        if (!draft.date || draft.date < today) next.date = "Please choose today or a future date.";
        if (!draft.windowStart || !draft.windowEnd) next.window = "Please choose when you're available.";
        else if (draft.windowEnd <= draft.windowStart) next.window = "The end time must be after the start time.";
        else if (draft.custom && timeDiff(draft.windowStart, draft.windowEnd) < 60)
          next.window = "Please allow at least one hour.";
        setErrors(next);
        if (!next.date && !next.window) onNext();
      }}
      className="space-y-5"
    >
      <h1 className="text-3xl sm:text-4xl">When are you available?</h1>
      <p className="rounded-md border border-border bg-primary-soft p-3 text-sm text-accent-foreground">
        You choose when you're available. We'll find an exact appointment time that works for you and the technician.
      </p>
      <Field label="Date" error={errors.date}>
        <input
          type="date"
          min={today}
          className={inputCls}
          aria-invalid={Boolean(errors.date)}
          value={draft.date}
          onChange={(e) => update({ date: e.target.value })}
        />
      </Field>
      <fieldset>
        <legend className="text-sm font-medium">Availability window</legend>
        <div className="mt-1.5 grid gap-2">
          {WINDOWS.map((w) => {
            const active = !draft.custom && draft.windowStart === w.start && draft.windowEnd === w.end;
            return (
              <button
                key={w.start}
                type="button"
                onClick={() => update({ windowStart: w.start, windowEnd: w.end, custom: false })}
                className={cn(
                  "flex items-center justify-between rounded-md border bg-card px-4 py-3 text-sm transition",
                  active ? "border-primary ring-2 ring-ring/30" : "border-border hover:border-primary/60",
                )}
              >
                {formatTime(w.start)} – {formatTime(w.end)}
                {active ? <Check className="h-4 w-4 text-primary" /> : null}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => update({ custom: true, windowStart: "", windowEnd: "" })}
            className={cn(
              "rounded-md border bg-card px-4 py-3 text-left text-sm transition",
              draft.custom ? "border-primary ring-2 ring-ring/30" : "border-border hover:border-primary/60",
            )}
          >
            Custom window
          </button>
          {draft.custom ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label="From">
                <input type="time" min="07:00" max="19:00" className={inputCls} value={draft.windowStart} onChange={(e) => update({ windowStart: e.target.value })} />
              </Field>
              <Field label="Until">
                <input type="time" min="08:00" max="20:00" className={inputCls} value={draft.windowEnd} onChange={(e) => update({ windowEnd: e.target.value })} />
              </Field>
            </div>
          ) : null}
        </div>
        {errors.window ? <p className="mt-1 text-xs text-destructive">{errors.window}</p> : null}
      </fieldset>
      <Button type="submit" size="lg" className="w-full">Review request</Button>
    </form>
  );
}

function timeDiff(a: string, b: string) {
  const m = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  return m(b) - m(a);
}

function StepReview({ draft, onEdit, onSubmit, busy }: { draft: Draft; onEdit: (i: number) => void; onSubmit: () => void; busy: boolean }) {
  const fee = draft.service?.base_service_fee ?? "1000";
  return (
    <div>
      <h1 className="text-3xl sm:text-4xl">Review your request</h1>
      <dl className="mt-6 divide-y divide-border rounded-lg border border-border bg-card shadow-card">
        <ReviewRow label="Repair" onEdit={() => onEdit(0)}>{draft.service?.name}</ReviewRow>
        <ReviewRow label="Problem" onEdit={() => onEdit(1)}>
          <span className="whitespace-pre-wrap">{draft.problem}</span>
          {draft.brand || draft.model ? (
            <span className="mt-1 block text-muted-foreground">{[draft.brand, draft.model].filter(Boolean).join(" · ")}</span>
          ) : null}
        </ReviewRow>
        <ReviewRow label="Location" onEdit={() => onEdit(2)}>
          {draft.loc?.address}
          {draft.loc ? <span className="block text-muted-foreground">{draft.loc.lga}, {draft.loc.state}</span> : null}
          {draft.landmark ? <span className="block text-muted-foreground">{draft.landmark}</span> : null}
        </ReviewRow>
        <ReviewRow label="Availability" onEdit={() => onEdit(3)}>
          {formatSlot(draft.date, draft.windowStart, draft.windowEnd)}
        </ReviewRow>
        <ReviewRow label="Service call">{formatNaira(fee)}</ReviewRow>
      </dl>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        The {formatNaira(fee)} service-call fee covers the technician's visit and diagnosis. Repair labor and
        replacement parts are separate and will be discussed after inspection.
      </p>
      <Button size="lg" className="mt-6 w-full" disabled={busy} onClick={onSubmit}>
        Find a Technician
      </Button>
    </div>
  );
}

function ReviewRow({ label, children, onEdit }: { label: string; children: ReactNode; onEdit?: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 p-4">
      <div className="min-w-0">
        <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
        <dd className="mt-1 text-sm">{children}</dd>
      </div>
      {onEdit ? (
        <button type="button" onClick={onEdit} className="shrink-0 text-xs font-medium text-primary hover:underline">
          Edit
        </button>
      ) : null}
    </div>
  );
}

function SelectedService({ service }: { service: ServiceRecord | null }) {
  if (!service) return null;
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
      <ServiceIcon name={service.name} className="h-4 w-4 text-primary" />
      {service.name}
    </div>
  );
}

/* --------------------------------------------------------- post-submit */

function phaseFor(b: BookingView): Phase {
  return b.technician ? "matched" : b.waiting ? "waiting" : "none";
}

function Matching({
  title = "Finding a technician near you…",
  text = "Checking verified technicians, their areas and schedules.",
}: { title?: string; text?: string }) {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <div className="relative flex h-24 w-24 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-primary/15 [animation-duration:1.8s]" />
        <span className="absolute inset-3 animate-ping rounded-full bg-primary/20 [animation-delay:0.4s] [animation-duration:1.8s]" />
        <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <MapPin className="h-6 w-6" />
        </span>
      </div>
      <h1 className="mt-8 text-2xl sm:text-3xl">{title}</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function TechnicianCardView({ booking }: { booking: BookingView }) {
  const t = booking.technician!;
  const initials = (t.full_name ?? "?").split(" ").map((p) => p[0]).join("").slice(0, 2);
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-card">
      <div className="flex items-start gap-4">
        {t.avatar_url ? (
          <img src={t.avatar_url} alt="" className="h-14 w-14 rounded-full object-cover" />
        ) : (
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-soft text-lg font-semibold text-accent-foreground">
            {initials}
          </span>
        )}
        <div className="min-w-0">
          <p className="text-lg font-semibold">{t.full_name}</p>
          <p className="mt-0.5 inline-flex items-center gap-1 text-sm text-primary">
            <BadgeCheck className="h-4 w-4" /> Verified technician
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{t.services.join(" · ")}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <span className="inline-flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-current text-primary" /> {Number(t.rating).toFixed(1)} · {t.completed_jobs} jobs
            </span>
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> Near {t.near_area ?? booking.area_name}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{t.available ? "Available for new jobs" : "Limited availability"}</p>
        </div>
      </div>
    </div>
  );
}

function MatchedView({ booking, busy, onConfirm, onChange }: { booking: BookingView; busy: boolean; onConfirm: () => void; onChange: () => void }) {
  return (
    <div className="rise-in">
      <h1 className="text-3xl sm:text-4xl">We found a technician for you</h1>
      <div className="mt-6"><TechnicianCardView booking={booking} /></div>
      <div className="mt-4 rounded-lg border border-border bg-card p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Proposed appointment</p>
        <p className="mt-1 flex items-center gap-2 text-lg font-semibold">
          <CalendarDays className="h-5 w-5 text-primary" />
          {formatSlot(booking.proposed_date, booking.proposed_start, booking.proposed_end)}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">This time fits within your requested availability window.</p>
      </div>
      <FeeBox fee={booking.service_fee} />
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Button size="lg" disabled={busy} onClick={onConfirm}>Confirm &amp; Pay {formatNaira(booking.service_fee)}</Button>
        <Button size="lg" variant="outline" disabled={busy} onClick={onChange}>Change Request</Button>
      </div>
    </div>
  );
}

function BookedView({ booking }: { booking: BookingView }) {
  return (
    <div className="rise-in">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Check className="h-6 w-6" />
      </span>
      <h1 className="mt-5 text-4xl sm:text-5xl">You're booked.</h1>
      <dl className="mt-6 divide-y divide-border rounded-lg border border-border bg-card shadow-card">
        <ReviewRow label="Technician">{booking.technician?.full_name}</ReviewRow>
        <ReviewRow label="Repair">{booking.service_name} repair</ReviewRow>
        <ReviewRow label="Appointment">
          <span className="font-semibold">{formatSlot(booking.proposed_date, booking.proposed_start, booking.proposed_end)}</span>
        </ReviewRow>
        <ReviewRow label="Location">{booking.address}, {booking.area_name}</ReviewRow>
        <ReviewRow label="Service call">{formatNaira(booking.service_fee)}</ReviewRow>
        <ReviewRow label="Payment">
          <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium">
            {booking.payment_status === "paid" ? "Paid · Demo" : "Not paid"}
          </span>
          <span className="mt-1 block text-xs text-muted-foreground">Demo payment — no real money was charged.</span>
        </ReviewRow>
      </dl>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Button asChild size="lg"><Link to="/dashboard">View Appointment</Link></Button>
        <Button asChild size="lg" variant="outline"><Link to="/dashboard">Back to dashboard</Link></Button>
      </div>
    </div>
  );
}

function FeeBox({ fee }: { fee: string | null }) {
  return (
    <div className="mt-4 rounded-lg border border-border bg-card p-5">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Service call</p>
        <p className="text-xl font-semibold">{formatNaira(fee)}</p>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        The service-call fee covers the technician's visit and diagnosis. Repair labor and replacement parts are separate.
      </p>
    </div>
  );
}

function PaymentView({ booking, busy, onPay, onBack }: { booking: BookingView; busy: boolean; onPay: () => void; onBack: () => void }) {
  return (
    <div className="rise-in">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-primary/50 px-2.5 py-0.5 text-xs font-medium text-primary">
        <CreditCard className="h-3.5 w-3.5" /> Demo payment
      </span>
      <h1 className="mt-4 text-3xl sm:text-4xl">Pay to confirm</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This is a simulated payment for the demo. No card is needed and no real money is charged.
      </p>
      <dl className="mt-6 divide-y divide-border rounded-lg border border-border bg-card shadow-card">
        <ReviewRow label="Technician">{booking.technician?.full_name}</ReviewRow>
        <ReviewRow label="Appointment">{formatSlot(booking.proposed_date, booking.proposed_start, booking.proposed_end)}</ReviewRow>
        <ReviewRow label="Amount"><span className="text-lg font-semibold">{formatNaira(booking.service_fee)}</span></ReviewRow>
      </dl>
      <p className="mt-3 text-xs text-muted-foreground">{SERVICE_FEE_NOTE}</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Button size="lg" disabled={busy} onClick={onPay}>{busy ? "Processing…" : `Pay ${formatNaira(booking.service_fee)}`}</Button>
        <Button size="lg" variant="outline" disabled={busy} onClick={onBack}>Back</Button>
      </div>
    </div>
  );
}

function NoMatchView({
  booking, busy, onAlternative, onChange,
}: {
  booking: BookingView;
  busy: boolean;
  onAlternative: (a: AlternativeSlot) => void;
  onChange: (step: number) => void;
}) {
  return (
    <div className="rise-in">
      <h1 className="text-2xl sm:text-3xl">We couldn't find a technician yet</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        There isn't an available technician covering your area for this service and time right now. You have not been charged.
      </p>
      <dl className="mt-6 divide-y divide-border rounded-lg border border-border bg-card">
        <ReviewRow label="Service">{booking.service_name}</ReviewRow>
        <ReviewRow label="Area">{booking.area_name}</ReviewRow>
        <ReviewRow label="Requested date">{formatSlot(booking.requested_date, null, null)}</ReviewRow>
        <ReviewRow label="Availability window">
          {formatTime(booking.availability_start ?? "")} – {formatTime(booking.availability_end ?? "")}
        </ReviewRow>
      </dl>
      {booking.alternatives.length ? (
        <div className="mt-6">
          <p className="text-sm font-semibold">Technicians are free at these times</p>
          <div className="mt-3 grid gap-2">
            {booking.alternatives.map((a) => (
              <button
                key={`${a.date}-${a.start}`}
                type="button"
                disabled={busy}
                onClick={() => onAlternative(a)}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-4 text-left text-sm transition-colors hover:border-primary disabled:opacity-50"
              >
                <span className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" />{formatSlot(a.date, a.start, a.end)}</span>
                <span className="text-xs font-medium text-primary">Use this time</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Button variant="outline" disabled={busy} onClick={() => onChange(3)}>Try another time</Button>
        <Button variant="outline" disabled={busy} onClick={() => onChange(2)}>Change location</Button>
        <Button variant="outline" disabled={busy} onClick={() => onChange(0)}>Change service</Button>
      </div>
    </div>
  );
}
