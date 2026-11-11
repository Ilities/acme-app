export type UserRole = 'owner' | 'staff' | 'acme_admin';
export type PlanId = 'starter' | 'clinic' | 'group';
export type AppointmentStatus = 'booked' | 'completed' | 'cancelled' | 'no_show';
export type OrderStatus = 'pending' | 'paid' | 'failed';
export type DepositType = 'none' | 'fixed' | 'percent';
export type DepositStatus = 'pending' | 'paid' | 'failed';

export interface CurrentUser {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  clinicId: number | null;
}

export interface Clinic {
  id: number;
  name: string;
  slug: string;
  email: string;
  phone: string | null;
  addressLine: string | null;
  city: string;
  country: string;
  timezone: string;
  opensAt: string;
  closesAt: string;
  openDays: number[];
  bookingEnabled: boolean;
  depositsEnabled: boolean;
  depositRefundableHours: number;
  plan: PlanId | null;
}

export interface StaffMember {
  id: number;
  name: string;
  title: string;
  email: string | null;
  active: boolean;
}

export interface Service {
  id: number;
  name: string;
  description: string;
  durationMinutes: number;
  priceCents: number;
  depositType: DepositType;
  depositValue: number | null;
  active: boolean;
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
}

export interface AppointmentListItem {
  id: number;
  startsAt: string;
  endsAt: string;
  timeLabel: string;
  durationMinutes: number;
  /** What this booking was worth when it was made; later price edits don't change it. */
  priceCents: number;
  status: AppointmentStatus;
  source: 'online' | 'staff';
  notes: string | null;
  service: { id: number; name: string };
  staff: { id: number; name: string };
  customer: { id: number; name: string; email: string; phone: string | null };
  deposit: { amountCents: number; status: DepositStatus; paidAt: string | null } | null;
}

export interface DashboardData {
  clinicName: string;
  todayCount: number;
  weekCount: number;
  monthRevenueCents: number;
  upcoming: AppointmentListItem[];
}

export interface Plan {
  id: PlanId;
  name: string;
  description: string;
  priceCents: number;
  staffLimit: number | null;
  features: string[];
}

export interface PlanQuote {
  plan: Plan;
  subtotalCents: number;
  vatRate: number;
  vatCents: number;
  totalCents: number;
  currency: string;
}

export interface PlanOrder {
  id: number;
  plan: PlanId;
  subtotalCents: number;
  vatCents: number;
  amountCents: number;
  currency: string;
  status: OrderStatus;
  billingName: string;
  createdAt: string;
  paidAt: string | null;
}

export interface AdminOrder {
  id: number;
  clinicId: number;
  clinicName: string;
  plan: PlanId;
  amountCents: number;
  currency: string;
  status: OrderStatus;
  createdAt: string;
}

export interface BookingPageData {
  clinic: {
    name: string;
    slug: string;
    city: string;
    addressLine: string | null;
    phone: string | null;
    timezone: string;
    opensAt: string;
    closesAt: string;
    openDays: number[];
  };
  services: (Pick<Service, 'id' | 'name' | 'description' | 'durationMinutes' | 'priceCents'> & {
    /** Deposit due at booking; null when the service asks for none. */
    deposit: { amountCents: number; refundableHours: number } | null;
  })[];
  staff: Pick<StaffMember, 'id' | 'name' | 'title'>[];
}

export interface AvailableSlot {
  startsAt: string;
  label: string;
  staffIds: number[];
}

export interface BookingConfirmation {
  appointmentId: number;
  clinicName: string;
  /** Street address and city, so the customer knows where to go. */
  clinicAddressLine: string | null;
  clinicCity: string;
  /** The clinic's phone number, when it has one saved. */
  clinicPhone: string | null;
  serviceName: string;
  staffName: string;
  when: string;
  depositPaidCents: number | null;
}
