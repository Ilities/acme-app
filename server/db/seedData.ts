import type { PlanId, UserRole } from './schema.js';

export interface SeedClinic {
  name: string;
  slug: string;
  email: string;
  phone: string;
  addressLine: string;
  city: string;
  country: string;
  timezone: string;
  opensAt: string;
  closesAt: string;
  openDays: string;
  plan: PlanId | null;
  users: { name: string; email: string; role: UserRole }[];
  staff: { name: string; title: string; email?: string }[];
  services: { name: string; description: string; durationMinutes: number; priceCents: number }[];
  customerNames: { first: string[]; last: string[] };
  emailDomain: string;
  phonePrefix: string;
  appointmentCount: number;
  orders: { plan: PlanId; monthsAgo: number; status: 'paid' | 'failed' }[];
}

const FINNISH_FIRST = [
  'Aino', 'Eino', 'Helmi', 'Väinö', 'Ilona', 'Onni', 'Sofia', 'Leevi', 'Emma', 'Elias',
  'Venla', 'Oliver', 'Linnea', 'Eetu', 'Kerttu', 'Juho', 'Siiri', 'Aleksi', 'Pihla', 'Joonas',
];
const FINNISH_LAST = [
  'Korhonen', 'Virtanen', 'Mäkinen', 'Nieminen', 'Mäkelä', 'Hämäläinen', 'Laine', 'Heikkinen',
  'Koskinen', 'Järvinen', 'Lehtonen', 'Saarinen', 'Salminen', 'Heinonen', 'Niemi', 'Kinnunen',
];
const SWEDISH_FIRST = [
  'Alice', 'William', 'Maja', 'Hugo', 'Elsa', 'Liam', 'Astrid', 'Noah', 'Wilma', 'Lucas',
  'Ebba', 'Oscar', 'Saga', 'Axel', 'Freja', 'Elias', 'Alva', 'Nils', 'Klara', 'Isak',
];
const SWEDISH_LAST = [
  'Andersson', 'Johansson', 'Karlsson', 'Nilsson', 'Eriksson', 'Larsson', 'Olsson', 'Persson',
  'Svensson', 'Gustafsson', 'Pettersson', 'Jonsson', 'Lindberg', 'Lindqvist', 'Berg', 'Holm',
];

export const ACME_ADMINS = [{ name: 'Sanna Rautio', email: 'sanna@acme.example' }];

export const SEED_PASSWORD = 'password123';

export const SEED_CLINICS: SeedClinic[] = [
  {
    name: 'Kallio Physiotherapy',
    slug: 'kallio-physio',
    email: 'hello@kalliophysio.example',
    phone: '+358 9 4242 1100',
    addressLine: 'Helsinginkatu 14',
    city: 'Helsinki',
    country: 'FI',
    timezone: 'Europe/Helsinki',
    opensAt: '08:00',
    closesAt: '18:00',
    openDays: '1,2,3,4,5',
    plan: 'clinic',
    users: [
      { name: 'Aino Virtanen', email: 'aino@kalliophysio.example', role: 'owner' },
      { name: 'Mikko Laine', email: 'mikko@kalliophysio.example', role: 'staff' },
    ],
    staff: [
      { name: 'Aino Virtanen', title: 'Physiotherapist', email: 'aino@kalliophysio.example' },
      { name: 'Mikko Laine', title: 'Physiotherapist', email: 'mikko@kalliophysio.example' },
      { name: 'Hanna Koskinen', title: 'Sports massage therapist' },
      { name: 'Tuomas Rinne', title: 'Osteopath' },
    ],
    services: [
      {
        name: 'Initial assessment',
        description: 'Full assessment and treatment plan for new clients.',
        durationMinutes: 60,
        priceCents: 8900,
      },
      {
        name: 'Follow-up treatment',
        description: 'Treatment session for existing clients.',
        durationMinutes: 45,
        priceCents: 6900,
      },
      {
        name: 'Sports massage',
        description: 'Deep tissue massage focused on recovery.',
        durationMinutes: 60,
        priceCents: 7500,
      },
      {
        name: 'Osteopathy',
        description: 'Hands-on treatment for joint and muscle pain.',
        durationMinutes: 45,
        priceCents: 8000,
      },
      {
        name: 'Running analysis',
        description: 'Video gait analysis with written recommendations.',
        durationMinutes: 90,
        priceCents: 12900,
      },
    ],
    customerNames: { first: FINNISH_FIRST, last: FINNISH_LAST },
    emailDomain: 'example.com',
    phonePrefix: '+358 40',
    appointmentCount: 110,
    orders: [
      { plan: 'starter', monthsAgo: 9, status: 'paid' },
      { plan: 'clinic', monthsAgo: 5, status: 'failed' },
      { plan: 'clinic', monthsAgo: 5, status: 'paid' },
    ],
  },
  {
    name: 'Studio Lumo',
    slug: 'studio-lumo',
    email: 'studio@studiolumo.example',
    phone: '+358 50 311 2040',
    addressLine: 'Fredrikinkatu 22',
    city: 'Helsinki',
    country: 'FI',
    timezone: 'Europe/Helsinki',
    opensAt: '10:00',
    closesAt: '20:00',
    openDays: '1,2,3,4,5,6',
    plan: 'starter',
    users: [{ name: 'Jenni Heikkinen', email: 'jenni@studiolumo.example', role: 'owner' }],
    staff: [
      { name: 'Jenni Heikkinen', title: 'Pilates instructor', email: 'jenni@studiolumo.example' },
      { name: 'Oona Salo', title: 'Yoga teacher' },
    ],
    services: [
      {
        name: 'Private pilates',
        description: 'One-to-one reformer session.',
        durationMinutes: 60,
        priceCents: 8500,
      },
      {
        name: 'Private yoga',
        description: 'Personal yoga session adapted to your level.',
        durationMinutes: 60,
        priceCents: 7500,
      },
      {
        name: 'Intro session',
        description: 'A short first session to find the right practice for you.',
        durationMinutes: 30,
        priceCents: 3500,
      },
      {
        name: 'Pilates duo',
        description: 'Reformer session for two people.',
        durationMinutes: 60,
        priceCents: 11000,
      },
    ],
    customerNames: { first: FINNISH_FIRST, last: FINNISH_LAST },
    emailDomain: 'example.com',
    phonePrefix: '+358 50',
    appointmentCount: 70,
    orders: [{ plan: 'starter', monthsAgo: 3, status: 'paid' }],
  },
  {
    name: 'Södermalm Hudklinik',
    slug: 'sodermalm-hud',
    email: 'info@sodermalmhud.example',
    phone: '+46 8 640 12 30',
    addressLine: 'Götgatan 41',
    city: 'Stockholm',
    country: 'SE',
    timezone: 'Europe/Stockholm',
    opensAt: '09:00',
    closesAt: '17:00',
    openDays: '1,2,3,4,5',
    plan: 'group',
    users: [
      { name: 'Karin Lindqvist', email: 'karin@sodermalmhud.example', role: 'owner' },
      { name: 'Johan Berg', email: 'johan@sodermalmhud.example', role: 'staff' },
    ],
    staff: [
      { name: 'Karin Lindqvist', title: 'Dermatologist', email: 'karin@sodermalmhud.example' },
      { name: 'Johan Berg', title: 'Dermatology nurse', email: 'johan@sodermalmhud.example' },
      { name: 'Sara Holm', title: 'Skin therapist' },
      { name: 'Emil Nyström', title: 'Laser specialist' },
      { name: 'Lina Ek', title: 'Skin therapist' },
    ],
    services: [
      {
        name: 'Skin consultation',
        description: 'Consultation with a dermatologist.',
        durationMinutes: 30,
        priceCents: 9500,
      },
      {
        name: 'Mole check',
        description: 'Full body mole check with dermatoscope.',
        durationMinutes: 30,
        priceCents: 12000,
      },
      {
        name: 'Facial treatment',
        description: 'Cleansing facial treatment tailored to your skin.',
        durationMinutes: 60,
        priceCents: 11000,
      },
      {
        name: 'Laser treatment',
        description: 'Laser treatment for pigmentation and redness.',
        durationMinutes: 45,
        priceCents: 19500,
      },
      {
        name: 'Chemical peel',
        description: 'Medical grade peel with aftercare advice.',
        durationMinutes: 45,
        priceCents: 14500,
      },
    ],
    customerNames: { first: SWEDISH_FIRST, last: SWEDISH_LAST },
    emailDomain: 'example.com',
    phonePrefix: '+46 70',
    appointmentCount: 120,
    orders: [
      { plan: 'clinic', monthsAgo: 11, status: 'paid' },
      { plan: 'group', monthsAgo: 4, status: 'paid' },
    ],
  },
  {
    name: 'Vasastan Fysio & Massage',
    slug: 'vasastan-fysio',
    email: 'kontakt@vasastanfysio.example',
    phone: '+46 8 31 77 02',
    addressLine: 'Odengatan 68',
    city: 'Stockholm',
    country: 'SE',
    timezone: 'Europe/Stockholm',
    opensAt: '07:30',
    closesAt: '19:00',
    openDays: '1,2,3,4,5',
    plan: null,
    users: [{ name: 'Erik Sjöberg', email: 'erik@vasastanfysio.example', role: 'owner' }],
    staff: [
      { name: 'Erik Sjöberg', title: 'Physiotherapist', email: 'erik@vasastanfysio.example' },
      { name: 'Malin Forsberg', title: 'Massage therapist' },
      { name: 'Ali Hassan', title: 'Naprapath' },
    ],
    services: [
      {
        name: 'Physiotherapy',
        description: 'Assessment and treatment.',
        durationMinutes: 45,
        priceCents: 7900,
      },
      {
        name: 'Classic massage',
        description: 'Relaxing full body massage.',
        durationMinutes: 60,
        priceCents: 8500,
      },
      {
        name: 'Naprapathy',
        description: 'Treatment for back and neck problems.',
        durationMinutes: 45,
        priceCents: 8200,
      },
    ],
    customerNames: { first: SWEDISH_FIRST, last: SWEDISH_LAST },
    emailDomain: 'example.com',
    phonePrefix: '+46 73',
    appointmentCount: 60,
    orders: [{ plan: 'starter', monthsAgo: 1, status: 'failed' }],
  },
];

export const APPOINTMENT_NOTES = [
  'Prefers morning appointments',
  'Follow-up after knee surgery',
  'Allergic to latex',
  'First visit, referred by a friend',
  'Bring previous scans',
  'Asked for a receipt for insurance',
  'Running a marathon next month',
  'Recurring lower back pain',
];
