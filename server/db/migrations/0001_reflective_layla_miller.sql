CREATE TABLE `deposit_payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`clinic_id` integer NOT NULL,
	`appointment_id` integer NOT NULL,
	`amount_cents` integer NOT NULL,
	`currency` text DEFAULT 'EUR' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`provider_reference` text,
	`failure_reason` text,
	`refundable_hours` integer NOT NULL,
	`paid_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`clinic_id`) REFERENCES `clinics`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `deposit_payments_clinic_idx` ON `deposit_payments` (`clinic_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `deposit_payments_appointment_idx` ON `deposit_payments` (`appointment_id`);--> statement-breakpoint
ALTER TABLE `clinics` ADD `deposits_enabled` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `clinics` ADD `deposit_refundable_hours` integer DEFAULT 24 NOT NULL;--> statement-breakpoint
ALTER TABLE `services` ADD `deposit_type` text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `services` ADD `deposit_value` integer;