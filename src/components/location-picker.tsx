import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Crosshair, Loader2, MapPin, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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

type Resolved = { address: string; state: string | null; lga: string | null; lat: number; lng: number };

// Minimal typing for the parts of the Google Maps JS API we use.
/* eslint-disable @typescript-eslint/no-explicit-any */
type G = any;
declare global {
  interface Window { google?: G; __fixrightMapsLoading?: Promise<G> }
}

function loadMaps(key: string): Promise<G> {
  if (window.google?.maps?.places) return Promise.resolve(window.google);
  if (!window.__fixrightMapsLoading) {
    window.__fixrightMapsLoading = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&region=NG`;
      s.async = true;
      s.onload = () => resolve(window.google);
      s.onerror = () => { window.__fixrightMapsLoading = undefined; reject(new Error("maps")); };
      document.head.appendChild(s);
    });
  }
  return window.__fixrightMapsLoading;
}

const KADUNA = { lat: 10.5105, lng: 7.4165 };
const inputCls =
  "w-full rounded-md border border-input bg-card px-3 py-2.5 text-base outline-none focus:border-primary focus:ring-2 focus:ring-ring/30";

function stateLabel(s: string) {
  return s === "Federal Capital Territory" ? s : `${s} State`;
}

function readComponents(result: G): { state: string | null; lga: string | null } {
  const comps: Array<{ long_name: string; types: string[] }> = result?.address_components ?? [];
  const find = (t: string) => comps.find((c) => c.types.includes(t))?.long_name ?? null;
  const country = comps.find((c) => c.types.includes("country"));
  if (country && !/nigeria/i.test(country.long_name)) return { state: null, lga: null };
  const state = matchState(find("administrative_area_level_1"));
  const lga = state ? matchLga(state, find("administrative_area_level_2")) ?? matchLga(state, find("locality")) : null;
  return { state, lga };
}

/** Customer location: search, current location, or drag the pin. State and LGA are read from the map. */
export function LocationPicker({ value, onConfirm }: { value: PickedLocation | null; onConfirm: (v: PickedLocation) => void }) {
  const fetchConfig = useServerFn(getMapsConfig);
  const { data: cfg, isLoading } = useQuery({ queryKey: ["maps-config"], queryFn: () => fetchConfig(), staleTime: Infinity });
  const [failed, setFailed] = useState(false);

  if (isLoading) return <div className="flex h-72 items-center justify-center rounded-lg border border-border bg-muted"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (!cfg?.key || failed) return <ManualLocation value={value} onConfirm={onConfirm} />;
  return <MapLocation apiKey={cfg.key} value={value} onConfirm={onConfirm} onFail={() => setFailed(true)} />;
}

function MapLocation({ apiKey, value, onConfirm, onFail }: { apiKey: string; value: PickedLocation | null; onConfirm: (v: PickedLocation) => void; onFail: () => void }) {
  const mapEl = useRef<HTMLDivElement>(null);
  const searchEl = useRef<HTMLInputElement>(null);
  const markerRef = useRef<G>(null);
  const mapRef = useRef<G>(null);
  const geocoderRef = useRef<G>(null);
  const [resolved, setResolved] = useState<Resolved | null>(null);
  const [busy, setBusy] = useState(false);
  const [locErr, setLocErr] = useState<string | null>(null);

  const reverse = (lat: number, lng: number) => {
    setBusy(true);
    geocoderRef.current.geocode({ location: { lat, lng } }, (results: G[] | null, status: string) => {
      setBusy(false);
      if (status !== "OK" || !results?.length) { setResolved({ address: "", state: null, lga: null, lat, lng }); return; }
      let state: string | null = null; let lga: string | null = null;
      for (const r of results) {
        const c = readComponents(r);
        state ??= c.state;
        if (c.state && c.lga && c.state === state) { lga = c.lga; break; }
      }
      setResolved({ address: results[0].formatted_address, state, lga, lat, lng });
    });
  };

  useEffect(() => {
    let cancelled = false;
    loadMaps(apiKey).then((google) => {
      if (cancelled || !mapEl.current) return;
      const start = value?.latitude != null && value.longitude != null ? { lat: value.latitude, lng: value.longitude } : KADUNA;
      const map = new google.maps.Map(mapEl.current, {
        center: start, zoom: value ? 16 : 12, disableDefaultUI: true, zoomControl: true, clickableIcons: false,
      });
      const marker = new google.maps.Marker({ position: start, map, draggable: true });
      mapRef.current = map; markerRef.current = marker;
      geocoderRef.current = new google.maps.Geocoder();
      marker.addListener("dragend", () => { const p = marker.getPosition(); reverse(p.lat(), p.lng()); });
      map.addListener("click", (e: G) => { marker.setPosition(e.latLng); reverse(e.latLng.lat(), e.latLng.lng()); });
      if (searchEl.current) {
        const ac = new google.maps.places.Autocomplete(searchEl.current, { componentRestrictions: { country: "ng" }, fields: ["geometry"] });
        ac.addListener("place_changed", () => {
          const loc = ac.getPlace()?.geometry?.location;
          if (!loc) return;
          map.setCenter(loc); map.setZoom(17); marker.setPosition(loc);
          reverse(loc.lat(), loc.lng());
        });
      }
      if (value?.latitude != null && value.longitude != null) reverse(value.latitude, value.longitude);
    }).catch(() => !cancelled && onFail());
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  const useCurrent = () => {
    setLocErr(null);
    if (!navigator.geolocation) { setLocErr("Your browser can't share your location. Search for your address instead."); return; }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        mapRef.current?.setCenter(p); mapRef.current?.setZoom(17); markerRef.current?.setPosition(p);
        reverse(p.lat, p.lng);
      },
      () => { setBusy(false); setLocErr("We couldn't get your location. Search for your address or move the pin."); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const confirmed = value && resolved && value.latitude === resolved.lat && value.longitude === resolved.lng;
  const ok = resolved?.state && resolved.lga;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input ref={searchEl} className={`${inputCls} pl-9`} placeholder="Search for your address" />
      </div>
      <Button type="button" variant="outline" size="sm" onClick={useCurrent}>
        <Crosshair className="h-4 w-4" /> Use my current location
      </Button>
      {locErr ? <p className="text-sm text-destructive">{locErr}</p> : null}
      <div ref={mapEl} className="h-72 w-full overflow-hidden rounded-lg border border-border bg-muted" />
      <p className="text-xs text-muted-foreground">Drag the pin or tap the map to place it exactly where the technician should come.</p>

      {busy ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Finding this address…</p>
      ) : resolved ? (
        ok ? (
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="flex items-start gap-2 text-sm font-medium"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{resolved.address}</p>
            <p className="mt-1 pl-6 text-sm text-muted-foreground">{resolved.lga}, {stateLabel(resolved.state!)}</p>
            <p className="mt-1 pl-6 text-xs text-muted-foreground">This is the location FixRight will use to find a technician.</p>
            {confirmed ? (
              <p className="mt-3 pl-6 text-sm font-medium text-primary">✓ Location confirmed</p>
            ) : (
              <Button type="button" className="mt-3" onClick={() => onConfirm({ address: resolved.address, state: resolved.state!, lga: resolved.lga!, latitude: resolved.lat, longitude: resolved.lng })}>
                Confirm location
              </Button>
            )}
          </div>
        ) : (
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
            {resolved.state === null && resolved.address
              ? "This pin doesn't look like it's in Nigeria. Please move the pin or search for your address."
              : "We couldn't confirm your local government area. Please adjust your pin or search for a nearby address."}
          </p>
        )
      ) : null}
    </div>
  );
}

/** Used only if the map can't load, so booking is never blocked. */
function ManualLocation({ value, onConfirm }: { value: PickedLocation | null; onConfirm: (v: PickedLocation) => void }) {
  const [address, setAddress] = useState(value?.address ?? "");
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
