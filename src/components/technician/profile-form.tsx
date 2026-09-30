import { useUser } from "@clerk/clerk-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { ServiceIcon } from "@/components/service-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { lgasForState, NIGERIA_STATES } from "@/lib/nigeria-locations";
import { listServices, saveMyTechProfile } from "@/lib/fixright.functions";
import type { TechProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { techKeys } from "./tech-ui";

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
        on ? "border-primary bg-primary-soft text-accent-foreground" : "border-border bg-card hover:border-primary/50",
      )}
    >
      {children}
    </button>
  );
}

export function TechProfileForm({ profile, submitLabel, onSaved }: { profile: TechProfile; submitLabel: string; onSaved?: () => void }) {
  const { user } = useUser();
  const fetchServices = useServerFn(listServices);
  const { data: services } = useQuery({ queryKey: ["services"], queryFn: () => fetchServices() });
  const save = useServerFn(saveMyTechProfile);
  const qc = useQueryClient();

  const [f, setF] = useState({
    fullName: profile.full_name ?? user?.fullName ?? "",
    phone: profile.phone ?? "",
    avatarUrl: profile.avatar_url ?? user?.imageUrl ?? "",
    bio: profile.bio ?? "",
    yearsExperience: String(profile.years_experience ?? 0),
    serviceIds: profile.service_ids,
    state: profile.coverage.state ?? "",
    entireState: profile.coverage.entireState,
    lgas: profile.coverage.lgas,
    workStart: profile.work_start,
    workEnd: profile.work_end,
    available: profile.available,
  });
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPhoto(file: File | undefined) {
    if (!file || !user) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { toast.error("Please choose a JPG, PNG or WebP photo."); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("That photo is too large. Please choose one under 10 MB."); return; }
    setUploading(true);
    try {
      await user.setProfileImage({ file });
      await user.reload();
      set({ avatarUrl: user.imageUrl });
      toast.success("Photo updated. Save your profile to keep it.");
    } catch {
      toast.error("We couldn't upload that photo. Please try another one.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const m = useMutation({
    mutationFn: () =>
      save({
        data: {
          fullName: f.fullName,
          phone: f.phone,
          avatarUrl: f.avatarUrl || null,
          bio: f.bio || null,
          yearsExperience: Number(f.yearsExperience) || 0,
          serviceIds: f.serviceIds,
          state: f.state,
          entireState: f.entireState,
          lgas: f.entireState ? [] : f.lgas,
          workStart: f.workStart,
          workEnd: f.workEnd,
          available: f.available,
        },
      }),
    onSuccess: (p) => {
      qc.setQueryData(techKeys.profile, p);
      void qc.invalidateQueries({ queryKey: techKeys.offers });
      toast.success("Profile saved.");
      onSaved?.();
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : "";
      toast.error(msg.includes("phone") ? "Enter a valid phone number." : "Please check your details and try again.");
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!f.serviceIds.length) { toast.error("Choose at least one service you repair."); return; }
    if (!f.state) { toast.error("Choose the state where you operate."); return; }
    if (!f.entireState && !f.lgas.length) { toast.error("Choose at least one LGA, or all LGAs in your state."); return; }
    if (f.workEnd <= f.workStart) { toast.error("Working hours must end after they start."); return; }
    m.mutate();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-8">
      <section className="grid gap-4 rounded-lg border border-border bg-card p-5 shadow-card">
        <h2 className="text-base font-semibold">About you</h2>
        <div className="flex items-center gap-4">
          {f.avatarUrl ? (
            <img src={f.avatarUrl} alt="Your profile photo" className="h-16 w-16 rounded-full border border-border object-cover" />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft text-lg font-semibold text-accent-foreground">
              {(f.fullName || "?").slice(0, 1)}
            </span>
          )}
          <div className="grid gap-1.5">
            <Label>Profile photo <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void onPhoto(e.target.files?.[0])} />
            <Button type="button" variant="outline" size="sm" className="w-fit" disabled={uploading} onClick={() => fileRef.current?.click()}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              {uploading ? "Uploading…" : f.avatarUrl ? "Change photo" : "Upload photo"}
            </Button>
            <p className="text-xs text-muted-foreground">JPG, PNG or WebP.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name"><Input required value={f.fullName} onChange={(e) => set({ fullName: e.target.value })} /></Field>
          <Field label="Phone number" hint="Shared with a customer only after you accept their request.">
            <Input required inputMode="tel" value={f.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="0803 000 0000" />
          </Field>
          <Field label="Years of experience">
            <Input type="number" min={0} max={60} value={f.yearsExperience} onChange={(e) => set({ yearsExperience: e.target.value })} />
          </Field>
        </div>
        <Field label="Short bio">
          <Textarea rows={3} maxLength={600} value={f.bio} onChange={(e) => set({ bio: e.target.value })} placeholder="What you repair and how you work." />
        </Field>
      </section>

      <section className="grid gap-4 rounded-lg border border-border bg-card p-5 shadow-card">
        <h2 className="text-base font-semibold">Services you repair</h2>
        <div className="flex flex-wrap gap-2">
          {(services ?? []).map((s) => (
            <Chip key={s.id} on={f.serviceIds.includes(s.id)} onClick={() => set({ serviceIds: toggle(f.serviceIds, s.id) })}>
              <ServiceIcon name={s.name} className="h-4 w-4" /> {s.name}
            </Chip>
          ))}
        </div>
      </section>

      <section className="grid gap-4 rounded-lg border border-border bg-card p-5 shadow-card">
        <div>
          <h2 className="text-base font-semibold">Where do you operate?</h2>
          <p className="mt-1 text-sm text-muted-foreground">Choose the areas where you regularly take repair jobs. Customers outside your selected areas won't be matched with you.</p>
        </div>
        <div className="max-w-xs">
          <Field label="State">
            <select
              className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
              value={f.state}
              onChange={(e) => set({ state: e.target.value, lgas: [], entireState: false })}
            >
              <option value="">Select your state</option>
              {NIGERIA_STATES.map((st) => <option key={st} value={st}>{st}</option>)}
            </select>
          </Field>
        </div>
        {f.state ? (
          <div className="grid gap-3">
            <Label>Coverage</Label>
            <div className="flex flex-wrap gap-2">
              <Chip on={f.entireState} onClick={() => set({ entireState: true, lgas: [] })}>All LGAs in {f.state}</Chip>
              <Chip on={!f.entireState} onClick={() => set({ entireState: false })}>Select LGAs</Chip>
            </div>
            {!f.entireState ? (
              <div className="flex flex-wrap gap-2">
                {lgasForState(f.state).map((l) => (
                  <Chip key={l} on={f.lgas.includes(l)} onClick={() => set({ lgas: toggle(f.lgas, l) })}>{l}</Chip>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 rounded-lg border border-border bg-card p-5 shadow-card">
        <h2 className="text-base font-semibold">Availability</h2>
        <div className="grid max-w-md gap-4 sm:grid-cols-2">
          <Field label="Working from"><Input type="time" value={f.workStart} onChange={(e) => set({ workStart: e.target.value })} /></Field>
          <Field label="Until"><Input type="time" value={f.workEnd} onChange={(e) => set({ workEnd: e.target.value })} /></Field>
        </div>
        <label className="flex items-center gap-3 text-sm">
          <Switch checked={f.available} onCheckedChange={(v) => set({ available: v })} />
          {f.available ? "Available for jobs" : "Not accepting requests"}
        </label>
      </section>

      <Button type="submit" size="lg" disabled={m.isPending} className="sm:w-fit">
        {m.isPending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
