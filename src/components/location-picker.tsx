import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Crosshair, Loader2, MapPin, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Map as MbMap, Marker as MbMarker } from "mapbox-gl";

import { Button } from "@/components/ui/button";
import { getMapsConfig } from "@/lib/fixright.functions";
import { lgasForState, matchLga, matchState, NIGERIA_STATES } from "@/lib/nigeria-locations";

export type PickedLocation = {
  address: string;
  state: string;
  lga: string;
  latitude: number | null;
  longitude: number | null;
};

type Resolved = { address: string; state: string | null; lga: string | null; lat: number; lng: number; nigeria: boolean };
type Suggestion = { id: string; name: string; sub: string; lat: number; lng: number };

const MB = "https://api.mapbox.com/search/geocode/v6";
const KADUNA: [number, number] = [7.4165, 10.5105];
const inputCls =
  "w-full rounded-md border border-input bg-card px-3 py-2.5 text-base outline-none focus:border-primary focus:ring-2 focus:ring-ring/30";

const MSG = {
  denied: "We couldn't access your location. Search for your address instead.",
  notFound: "We couldn't find that location. Try a nearby street, landmark or address.",
  noLga: "We couldn't confirm your local government area. Move the pin or choose a nearby address.",
  notNigeria: "This pin doesn't look like it's in Nigeria. Move the pin or search for your address.",
};

function stateLabel(s: string) {
  return s === "Federal Capital Territory" ? s : `${s} State`;
}
const clean = (s: string | undefined) => (s ?? "").replace(/,?\s*Nigeria$/i, "").trim();

/* eslint-disable @typescript-eslint/no-explicit-any */
async function reverseGeocode(token: string, lat: number, lng: number): Promise<Resolved> {
  const res = await fetch(`${MB}/reverse?longitude=${lng}&latitude=${lat}&country=ng&language=en&access_token=${token}`);
  if (!res.ok) throw new Error("geocode");
  const feats: any[] = (await res.json()).features ?? [];
  let state: string | null = null;
  let lga: string | null = null;
  for (const f of feats) {
    const c = f.properties?.context ?? {};
    const s = matchState(c.region?.name ?? (f.properties?.feature_type === "region" ? f.properties?.name : null));
    if (!s) continue;
    state ??= s;
    if (s !== state) continue;
    // Mapbox "place" is the LGA-level unit in Nigeria; accept only exact matches — never guess.
    lga = matchLga(s, c.place?.name) ?? matchLga(s, c.district?.name) ?? matchLga(s, c.locality?.name);
    if (lga) break;
  }
  return { address: clean(feats[0]?.properties?.full_address ?? feats[0]?.properties?.name), state, lga, lat, lng, nigeria: feats.length > 0 };
}

async function searchPlaces(token: string, q: string, near: [number, number] | null, signal: AbortSignal): Promise<Suggestion[]> {
  const prox = near ? `&proximity=${near[0]},${near[1]}` : "";
  const res = await fetch(`${MB}/forward?q=${encodeURIComponent(q)}&country=ng&autocomplete=true&limit=5&language=en${prox}&access_token=${token}`, { signal });
  if (!res.ok) throw new Error("search");
  const feats: any[] = (await res.json()).features ?? [];
  return feats.map((f) => ({
    id: f.id,
    name: f.properties?.name ?? "",
    sub: clean(f.properties?.place_formatted),
    lng: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
  }));
}

/** Customer location: search, current location, or drag the pin. State and LGA are read from Mapbox. */
export function LocationPicker({ value, onConfirm }: { value: PickedLocation | null; onConfirm: (v: PickedLocation) => void }) {
  const fetchConfig = useServerFn(getMapsConfig);
  const { data: cfg, isLoading } = useQuery({ queryKey: ["maps-config"], queryFn: () => fetchConfig(), staleTime: Infinity });
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState(!value);

  if (value && !editing) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Your location</p>
        <p className="mt-2 flex items-start gap-2 font-medium"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{value.lga}, {stateLabel(value.state)}</p>
        <p className="mt-1 pl-6 text-sm text-muted-foreground">{value.address}</p>
        <Button type="button" variant="outline" size="sm" className="mt-3 ml-6" onClick={() => setEditing(true)}>Adjust location</Button>
      </div>
    );
  }
  const done = (v: PickedLocation) => { onConfirm(v); setEditing(false); };
  if (isLoading) return <div className="flex h-72 items-center justify-center rounded-lg border border-border bg-muted"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (!cfg?.key || failed) return <ManualLocation value={value} onConfirm={done} />;
  return <MapLocation token={cfg.key} value={value} onConfirm={done} onFail={() => setFailed(true)} />;
}

function MapLocation({ token, value, onConfirm, onFail }: { token: string; value: PickedLocation | null; onConfirm: (v: PickedLocation) => void; onFail: () => void }) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MbMap | null>(null);
  const markerRef = useRef<MbMarker | null>(null);
  const reqId = useRef(0);
  const [resolved, setResolved] = useState<Resolved | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Suggestion[] | null>(null);
  const [searching, setSearching] = useState(false);

  const reverse = async (lat: number, lng: number) => {
    const id = ++reqId.current;
    setBusy(true);
    try {
      const r = await reverseGeocode(token, lat, lng);
      if (id === reqId.current) setResolved(r);
    } catch {
      if (id === reqId.current) setResolved({ address: "", state: null, lga: null, lat, lng, nigeria: false });
    } finally {
      if (id === reqId.current) setBusy(false);
    }
  };

  const moveTo = (lng: number, lat: number) => {
    mapRef.current?.flyTo({ center: [lng, lat], zoom: 16 });
    markerRef.current?.setLngLat([lng, lat]);
    void reverse(lat, lng);
  };

  useEffect(() => {
    let cancelled = false;
    let map: MbMap | null = null;
    (async () => {
      try {
        const mapboxgl = (await import("mapbox-gl")).default;
        await import("mapbox-gl/dist/mapbox-gl.css");
        if (cancelled || !mapEl.current) return;
        mapboxgl.accessToken = token;
        const has = value?.latitude != null && value.longitude != null;
        const start: [number, number] = has ? [value!.longitude!, value!.latitude!] : KADUNA;
        map = new mapboxgl.Map({ container: mapEl.current, style: "mapbox://styles/mapbox/streets-v12", center: start, zoom: has ? 16 : 11 });
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
        map.on("error", (e) => { if ((e as any)?.error?.status === 401) onFail(); });
        const marker = new mapboxgl.Marker({ draggable: true, color: "hsl(170 70% 30%)" }).setLngLat(start).addTo(map);
        marker.on("dragend", () => { const p = marker.getLngLat(); void reverse(p.lat, p.lng); });
        map.on("click", (e) => { marker.setLngLat(e.lngLat); void reverse(e.lngLat.lat, e.lngLat.lng); });
        mapRef.current = map; markerRef.current = marker;
        if (has) void reverse(start[1], start[0]);
      } catch {
        if (!cancelled) onFail();
      }
    })();
    return () => { cancelled = true; map?.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Debounced autocomplete: one request after the customer pauses typing.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 3) { setResults(null); return; }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const c = mapRef.current?.getCenter();
        setResults(await searchPlaces(token, term, c ? [c.lng, c.lat] : null, ctrl.signal));
      } catch { if (!ctrl.signal.aborted) setResults([]); }
      finally { if (!ctrl.signal.aborted) setSearching(false); }
    }, 350);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q, token]);

  const pick = (s: Suggestion) => { setQ(s.name); setResults(null); setMsg(null); moveTo(s.lng, s.lat); };

  const useCurrent = () => {
    setMsg(null);
    if (!navigator.geolocation) { setMsg(MSG.denied); return; }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => moveTo(pos.coords.longitude, pos.coords.latitude),
      () => { setBusy(false); setMsg(MSG.denied); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const ok = resolved?.state && resolved.lga;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          className={`${inputCls} pl-9`} placeholder="Search street, landmark or area" value={q}
          onChange={(e) => setQ(e.target.value)} aria-label="Search for your address" autoComplete="off"
        />
        {searching ? <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" /> : null}
        {results ? (
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-border bg-card shadow-md" role="listbox">
            {results.length === 0 ? (
              <p className="px-3 py-3 text-sm text-muted-foreground">{MSG.notFound}</p>
            ) : results.map((s) => (
              <button key={s.id} type="button" role="option" aria-selected="false" onClick={() => pick(s)}
                className="flex w-full items-start gap-2 px-3 py-2.5 text-left hover:bg-muted focus:bg-muted focus:outline-none">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span><span className="block text-sm font-medium">{s.name}</span><span className="block text-xs text-muted-foreground">{s.sub}</span></span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={useCurrent}>
        <Crosshair className="h-4 w-4" /> Use my current location
      </Button>
      {msg ? <p className="text-sm text-destructive">{msg}</p> : null}
      <div ref={mapEl} className="h-64 w-full overflow-hidden rounded-lg border border-border bg-muted sm:h-72" />
      <p className="text-xs text-muted-foreground">Drag the pin or tap the map to mark exactly where the technician should come.</p>

      {busy ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Finding this address…</p>
      ) : resolved ? (
        ok ? (
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="flex items-start gap-2 font-medium"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{resolved.lga}, {stateLabel(resolved.state!)}</p>
            {resolved.address ? <p className="mt-1 pl-6 text-sm text-muted-foreground">{resolved.address}</p> : null}
            <Button type="button" size="lg" className="mt-4 w-full"
              onClick={() => onConfirm({ address: resolved.address || `${resolved.lga}, ${stateLabel(resolved.state!)}`, state: resolved.state!, lga: resolved.lga!, latitude: resolved.lat, longitude: resolved.lng })}>
              Confirm location
            </Button>
          </div>
        ) : (
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
            {resolved.state === null ? (resolved.nigeria ? MSG.noLga : MSG.notNigeria) : MSG.noLga}
          </p>
        )
      ) : null}
    </div>
  );
}

  const [state, setState] = useState(value?.state ?? "");
  const [lga, setLga] = useState(value?.lga ?? "");
  const ready = address.trim().length >= 5 && state && lga;
  const confirmed = value && value.address === address && value.state === state && value.lga === lga;
  return (
    <div className="space-y-3">
      <p className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">The map isn't available right now, so please enter your address.</p>
      <input className={inputCls} placeholder="House number and street" value={address} onChange={(e) => setAddress(e.target.value)} maxLength={300} />
      <div className="grid gap-3 sm:grid-cols-2">
        <select className={inputCls} value={state} onChange={(e) => { setState(e.target.value); setLga(""); }}>
          <option value="">State</option>
          {NIGERIA_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className={inputCls} value={lga} disabled={!state} onChange={(e) => setLga(e.target.value)}>
          <option value="">Local government area</option>
          {lgasForState(state).map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>
      {confirmed ? <p className="text-sm font-medium text-primary">✓ Location confirmed</p> : (
        <Button type="button" disabled={!ready} onClick={() => onConfirm({ address: address.trim(), state, lga, latitude: null, longitude: null })}>Confirm location</Button>
      )}
    </div>
  );
}
