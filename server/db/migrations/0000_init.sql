CREATE TABLE `appointments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`clinic_id` integer NOT NULL,
	`service_id` integer NOT NULL,
	`staff_id` integer NOT NULL,
	`customer_id` integer NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`status` text DEFAULT 'booked' NOT NULL,
	`source` text NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`clinic_id`) REFERENCES `clinics`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`staff_id`) REFERENCES `staff_members`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `appointments_clinic_starts_idx` ON `appointments` (`clinic_id`,`starts_at`);--> statement-breakpoint
CREATE INDEX `appointments_staff_starts_idx` ON `appointments` (`staff_id`,`starts_at`);--> statement-breakpoint
CREATE TABLE `clinics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`address_line` text,
	`city` text NOT NULL,
	`country` text NOT NULL,
	`timezone` text DEFAULT 'Europe/Helsinki' NOT NULL,
	`opens_at` text DEFAULT '09:00' NOT NULL,
	`closes_at` text DEFAULT '17:00' NOT NULL,
	`open_days` text DEFAULT '1,2,3,4,5' NOT NULL,
	`booking_enabled` integer DEFAULT true NOT NULL,
	`plan` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `clinics_slug_unique` ON `clinics` (`slug`);--> statement-breakpoint
CREATE TABLE `customers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`clinic_id` integer NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`clinic_id`) REFERENCES `clinics`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customers_clinic_email_idx` ON `customers` (`clinic_id`,`email`);--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `password_reset_tokens_token_hash_unique` ON `password_reset_tokens` (`token_hash`);--> statement-breakpoint
CREATE TABLE `plan_orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`clinic_id` integer NOT NULL,
	`plan` text NOT NULL,
	`subtotal_cents` integer NOT NULL,
	`vat_cents` integer NOT NULL,
	`amount_cents` integer NOT NULL,
	`currency` text DEFAULT 'EUR' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`billing_name` text NOT NULL,
	`vat_id` text,
	`provider_reference` text,
	`failure_reason` text,
	`paid_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`clinic_id`) REFERENCES `clinics`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `plan_orders_clinic_idx` ON `plan_orders` (`clinic_id`);--> statement-breakpoint
CREATE TABLE `services` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`clinic_id` integer NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`duration_minutes` integer NOT NULL,
	`price_cents` integer NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`clinic_id`) REFERENCES `clinics`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `services_clinic_idx` ON `services` (`clinic_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`sid` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `staff_members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`clinic_id` integer NOT NULL,
	`name` text NOT NULL,
	`title` text NOT NULL,
	`email` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`clinic_id`) REFERENCES `clinics`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `staff_clinic_idx` ON `staff_members` (`clinic_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`clinic_id` integer,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text NOT NULL,
	`last_sign_in_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`clinic_id`) REFERENCES `clinics`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_idx` ON `users` (`email`);