import { useUser } from "@clerk/clerk-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

import { ServiceIcon } from "@/components/service-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { COVERAGE_AREAS } from "@/lib/config";
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
    areas: profile.areas,
    radiusKm: String(profile.service_radius_km ?? 10),
    workStart: profile.work_start,
    workEnd: profile.work_end,
    available: profile.available,
  });
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const areaOptions = Array.from(new Set([...COVERAGE_AREAS, ...profile.areas])).sort();

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
          areas: f.areas,
          radiusKm: Number(f.radiusKm) || 10,
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
    if (!f.areas.length) { toast.error("Choose at least one area you cover."); return; }
    if (f.workEnd <= f.workStart) { toast.error("Working hours must end after they start."); return; }
    m.mutate();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-8">
      <section className="grid gap-4 rounded-lg border border-border bg-card p-5 shadow-card">
        <h2 className="text-base font-semibold">About you</h2>
        <div className="flex items-center gap-4">
          {f.avatarUrl ? (
            <img src={f.avatarUrl} alt="" className="h-16 w-16 rounded-full border border-border object-cover" />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft text-lg font-semibold text-accent-foreground">
              {(f.fullName || "?").slice(0, 1)}
            </span>
          )}
          <div className="grid flex-1 gap-1.5">
            <Label htmlFor="avatar">Profile photo link</Label>
            <Input id="avatar" value={f.avatarUrl} onChange={(e) => set({ avatarUrl: e.target.value })} placeholder="https://…" />
            <p className="text-xs text-muted-foreground">We use your account photo by default. Photo uploads come later.</p>
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
        <h2 className="text-base font-semibold">Areas you cover</h2>
        <div className="flex flex-wrap gap-2">
          {areaOptions.map((a) => (
            <Chip key={a} on={f.areas.includes(a)} onClick={() => set({ areas: toggle(f.areas, a) })}>{a}</Chip>
          ))}
        </div>
        <div className="max-w-xs">
          <Field label="Travel radius (km)">
            <Input type="number" min={1} max={50} value={f.radiusKm} onChange={(e) => set({ radiusKm: e.target.value })} />
          </Field>
        </div>
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
