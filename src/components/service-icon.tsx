import {
  AirVent,
  Laptop,
  Refrigerator,
  Smartphone,
  Tv,
  WashingMachine,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

const icons: Record<string, LucideIcon> = {
  "Air Conditioner": AirVent,
  Refrigerator: Refrigerator,
  "Washing Machine": WashingMachine,
  Generator: Zap,
  Television: Tv,
  Laptop: Laptop,
  Phone: Smartphone,
};

export function ServiceIcon({ name, className }: { name: string; className?: string }) {
  const Icon = icons[name] ?? Wrench;
  return <Icon className={className} strokeWidth={1.6} />;
}
