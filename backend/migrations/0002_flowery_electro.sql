CREATE TABLE `monobank_connections` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_enc` text NOT NULL,
	`webhook_secret` text NOT NULL,
	`client_name` text DEFAULT '' NOT NULL,
	`webhook_url` text,
	`webhook_active` integer DEFAULT false NOT NULL,
	`last_sync_at` integer,
	`last_event_at` integer,
	`last_error` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mono_conn_user_uq` ON `monobank_connections` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `mono_conn_secret_uq` ON `monobank_connections` (`webhook_secret`);--> statement-breakpoint
CREATE TABLE `monobank_events` (
	`id` text PRIMARY KEY NOT NULL,
	`connection_id` text NOT NULL,
	`account` text NOT NULL,
	`amount` integer NOT NULL,
	`time` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `mono_events_account_idx` ON `monobank_events` (`account`);--> statement-breakpoint
ALTER TABLE `campaigns` ADD `raised_source` text DEFAULT 'organizer' NOT NULL;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `mono_connection_id` text;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `mono_jar_account` text;--> statement-breakpoint
CREATE INDEX `campaigns_mono_jar_idx` ON `campaigns` (`mono_jar_account`);