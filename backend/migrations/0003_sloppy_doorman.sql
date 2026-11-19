CREATE TABLE `helper_jars` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`user_id` text NOT NULL,
	`display_name` text NOT NULL,
	`goal_amount` integer NOT NULL,
	`photo_file_id` text,
	`photo_crop` text DEFAULT '{}' NOT NULL,
	`share_file_id` text,
	`jar_url` text NOT NULL,
	`jar_id` text NOT NULL,
	`raised_amount` integer DEFAULT 0 NOT NULL,
	`raised_updated_at` integer,
	`raised_source` text DEFAULT 'organizer' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`goal_reached_at` integer,
	`view_count` integer DEFAULT 0 NOT NULL,
	`donate_clicks` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `helper_campaign_idx` ON `helper_jars` (`campaign_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `helper_user_campaign_uq` ON `helper_jars` (`user_id`,`campaign_id`);--> statement-breakpoint
CREATE INDEX `helper_jar_idx` ON `helper_jars` (`jar_id`);--> statement-breakpoint
ALTER TABLE `campaigns` ADD `template_file_id` text;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `template_config` text;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `caption_template` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `helpers_raised` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `helpers_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `helpers_in_total` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `org_verified_at` integer;--> statement-breakpoint
ALTER TABLE `users` ADD `org_name` text;--> statement-breakpoint
ALTER TABLE `users` ADD `org_kind` text;--> statement-breakpoint
ALTER TABLE `users` ADD `org_code` text;--> statement-breakpoint
ALTER TABLE `users` ADD `org_website` text;--> statement-breakpoint
ALTER TABLE `verification_requests` ADD `kind` text DEFAULT 'identity' NOT NULL;--> statement-breakpoint
ALTER TABLE `verification_requests` ADD `details` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
-- Demo organizers publish the demo fundraisers, so they are organizations under the new rules.
UPDATE `users` SET `org_verified_at` = `created_at`, `org_name` = `name`, `org_kind` = 'initiative' WHERE `is_demo` = 1 AND `id` IN (SELECT `organizer_id` FROM `campaigns`);
