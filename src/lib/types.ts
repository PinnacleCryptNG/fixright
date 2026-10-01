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
  | "confirmed"
  | "on_the_way"
  | "arrived"
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
  avatar_url?: string | null;
  bio: string | null;
  rating: string;
  completed_jobs: number;
  years_experience: number;
  verification_status: VerificationStatus;
  available: boolean;
  areas: string[];
  services: string[];
};

/** Where a technician operates: one state, either entirely or specific LGAs. */
export type Coverage = { state: string | null; entireState: boolean; lgas: string[] };

export type AdminOverview = {
  customers: number;
  technicians: number;
  verifiedTechnicians: number;
  services: number;
  requests: number;
  appointments: number;
};

export type MatchedTechnician = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  rating: string;
  completed_jobs: number;
  years_experience: number;
  verification_status: VerificationStatus;
  available: boolean;
  services: string[];
  near_area: string | null;
};

export type BookingView = {
  id: string;
  status: RepairRequestStatus;
  problem_description: string;
  device_brand: string | null;
  device_model: string | null;
  address: string | null;
  area_name: string | null;
  state: string | null;
  lga: string | null;
  landmark: string | null;
  requested_date: string | null;
  availability_start: string | null;
  availability_end: string | null;
  proposed_date: string | null;
  proposed_start: string | null;
  proposed_end: string | null;
  service_id: string | null;
  service_name: string | null;
  service_fee: string | null;
  appointment_id: string | null;
  payment_status: PaymentStatus | null;
  technician: MatchedTechnician | null;
  alternatives: AlternativeSlot[];
  /** Offered to technicians, none has accepted yet. */
  waiting: boolean;
};

export type AlternativeSlot = { date: string; start: string; end: string };

export type CustomerBookings = {
  upcoming: Array<{
    id: string;
    repair_request_id: string | null;
    status: AppointmentStatus;
    payment_status: PaymentStatus;
    service_fee: string;
    appointment_date: string;
    start_time: string | null;
    end_time: string | null;
    service_name: string | null;
    technician_name: string | null;
    address: string | null;
    area_name: string | null;
  }>;
  requests: Array<{
    id: string;
    status: RepairRequestStatus;
    problem_description: string;
    service_name: string | null;
    created_at: string;
    requested_date: string | null;
    has_technician: boolean;
    waiting: boolean;
  }>;
};

export type TechProfile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
  years_experience: number;
  verification_status: VerificationStatus;
  rating: string;
  completed_jobs: number;
  available: boolean;
  work_start: string;
  work_end: string;
  service_ids: string[];
  coverage: Coverage;
  onboarded: boolean;
};

export type TechOffer = {
  id: string;
  service_name: string | null;
  problem_description: string;
  device_brand: string | null;
  device_model: string | null;
  area_name: string | null;
  address: string | null;
  landmark: string | null;
  requested_date: string | null;
  availability_start: string | null;
  availability_end: string | null;
  proposed_date: string;
  proposed_start: string;
  proposed_end: string;
  service_fee: string | null;
  offered_at: string;
  offer_status: "offered" | "accepted" | "declined" | "withdrawn";
};

export type TechJob = {
  id: string;
  repair_request_id: string | null;
  status: AppointmentStatus | "awaiting_payment";
  payment_status: PaymentStatus;
  service_name: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  address: string | null;
  area_name: string | null;
  landmark: string | null;
  problem_description: string | null;
  date: string;
  start_time: string | null;
  end_time: string | null;
};
