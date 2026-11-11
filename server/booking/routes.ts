import { Router } from 'express';
import { z } from 'zod';
import { isIsoDate } from '../lib/dates.js';
import { cardDetailsSchema } from '../payments/card.js';
import { createBooking, getAvailability, getBookableClinic, getBookingPage } from './bookingService.js';

export const bookingRouter = Router();

const availabilityQuerySchema = z.object({
  serviceId: z.coerce.number().int().positive(),
  staffId: z.coerce.number().int().positive().optional(),
  date: z.string().refine(isIsoDate, 'Use the format YYYY-MM-DD'),
});

const bookingSchema = z.object({
  serviceId: z.number().int().positive(),
  staffId: z.number().int().positive().optional(),
  startsAt: z.iso.datetime(),
  customer: z.object({
    name: z.string().trim().min(2, 'Enter your name').max(120),
    email: z.string().trim().email('Enter a valid email address'),
    phone: z.string().trim().max(40).nullable().optional(),
  }),
  // Required when the service asks for a deposit; checked in createBooking.
  card: cardDetailsSchema.optional(),
});

bookingRouter.get('/clinics/:slug', (req, res) => {
  const clinic = getBookableClinic(req.params.slug);
  res.json(getBookingPage(clinic));
});

bookingRouter.get('/clinics/:slug/availability', (req, res) => {
  const clinic = getBookableClinic(req.params.slug);
  const query = availabilityQuerySchema.parse(req.query);
  res.json({ date: query.date, slots: getAvailability(clinic, query) });
});

bookingRouter.post('/clinics/:slug/bookings', async (req, res) => {
  const clinic = getBookableClinic(req.params.slug);
  const input = bookingSchema.parse(req.body);
  const confirmation = await createBooking(clinic, {
    ...input,
    startsAt: new Date(input.startsAt),
  });
  res.status(201).json({ booking: confirmation });
});
