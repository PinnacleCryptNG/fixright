export type UserRole = "customer" | "technician" | "admin";

export type VerificationStatus = "pending" | "verified" | "rejected" | "suspended";

export type RepairRequestStatus =
  | "submitted"
  | "matching"
  | "technician_pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled";

export type AppointmentStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

export type PaymentStatus = "unpaid" | "pending" | "paid" | "refunded";

export type AppUser = {
  id: string;
  role: UserRole;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
};

export type ServiceRecord = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  base_service_fee: string;
  active: boolean;
};

export type TechnicianCard = {
  id: string;
  full_name: string | null;
  bio: string | null;
  rating: string;
  completed_jobs: number;
  years_experience: number;
  verification_status: VerificationStatus;
  available: boolean;
  areas: string[];
  services: string[];
};

export type AdminOverview = {
  customers: number;
  technicians: number;
  verifiedTechnicians: number;
  services: number;
  requests: number;
  appointments: number;
};
