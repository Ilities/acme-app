-- Drizzle emitted `ADD \`price_cents\` integer NOT NULL`, which SQLite rejects
-- ("Cannot add a NOT NULL column with default value NULL"). The DEFAULT 0 is
-- only here to make the ALTER legal; schema.ts keeps the column required with no
-- default, so application code still has to pass a price. Existing bookings are
-- then backfilled from their service: the service's current price is the only
-- record left of what those customers were charged.
ALTER TABLE `appointments` ADD `price_cents` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE `appointments` SET `price_cents` = (
	SELECT `price_cents` FROM `services` WHERE `services`.`id` = `appointments`.`service_id`
) WHERE `price_cents` = 0;
