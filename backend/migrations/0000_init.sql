CREATE TABLE `budget_items` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`label` text NOT NULL,
	`amount` integer NOT NULL,
	`position` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `budget_campaign_idx` ON `budget_items` (`campaign_id`);--> statement-breakpoint
CREATE TABLE `campaign_attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`file_id` text NOT NULL,
	`title` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `attach_campaign_idx` ON `campaign_attachments` (`campaign_id`);--> statement-breakpoint
CREATE TABLE `campaign_updates` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`author_id` text NOT NULL,
	`kind` text DEFAULT 'update' NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`spent_amount` integer,
	`file_ids` text DEFAULT '[]' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `updates_campaign_idx` ON `campaign_updates` (`campaign_id`);--> statement-breakpoint
CREATE TABLE `campaign_views` (
	`campaign_id` text NOT NULL,
	`visitor_hash` text NOT NULL,
	`day` text NOT NULL,
	`referrer_id` text,
	PRIMARY KEY(`campaign_id`, `visitor_hash`, `day`)
);
--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`organizer_id` text NOT NULL,
	`title` text NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`category` text NOT NULL,
	`city` text DEFAULT '' NOT NULL,
	`cover_file_id` text,
	`goal_amount` integer DEFAULT 0 NOT NULL,
	`raised_amount` integer DEFAULT 0 NOT NULL,
	`raised_updated_at` integer,
	`deadline` integer,
	`urgent` integer DEFAULT false NOT NULL,
	`jar_url` text,
	`jar_id` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`rejection_reason` text,
	`purpose_reviewed_at` integer,
	`destination_verified_at` integer,
	`view_count` integer DEFAULT 0 NOT NULL,
	`donate_clicks` integer DEFAULT 0 NOT NULL,
	`is_demo` integer DEFAULT false NOT NULL,
	`submitted_at` integer,
	`published_at` integer,
	`goal_reached_at` integer,
	`completed_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `campaigns_slug_uq` ON `campaigns` (`slug`);--> statement-breakpoint
CREATE INDEX `campaigns_status_idx` ON `campaigns` (`status`);--> statement-breakpoint
CREATE INDEX `campaigns_org_idx` ON `campaigns` (`organizer_id`);--> statement-breakpoint
CREATE TABLE `challenge_participants` (
	`challenge_id` text NOT NULL,
	`user_id` text NOT NULL,
	`joined_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`challenge_id`, `user_id`)
);
--> statement-breakpoint
CREATE TABLE `challenges` (
	`id` text PRIMARY KEY NOT NULL,
	`community_id` text,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`metric` text NOT NULL,
	`target` integer NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `communities` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`created_by` text NOT NULL,
	`is_demo` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `communities_slug_uq` ON `communities` (`slug`);--> statement-breakpoint
CREATE TABLE `community_members` (
	`community_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`joined_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`community_id`, `user_id`)
);
--> statement-breakpoint
CREATE INDEX `members_user_idx` ON `community_members` (`user_id`);--> statement-breakpoint
CREATE TABLE `content_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`reporter_id` text,
	`reason` text NOT NULL,
	`details` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`resolved_by` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `files` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`visibility` text DEFAULT 'public' NOT NULL,
	`data` blob,
	`storage_key` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `files_owner_idx` ON `files` (`owner_id`);--> statement-breakpoint
CREATE TABLE `follows` (
	`user_id` text NOT NULL,
	`campaign_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`user_id`, `campaign_id`)
);
--> statement-breakpoint
CREATE INDEX `follows_campaign_idx` ON `follows` (`campaign_id`);--> statement-breakpoint
CREATE TABLE `login_attempts` (
	`key` text NOT NULL,
	`window_start` integer NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`key`, `window_start`)
);
--> statement-breakpoint
CREATE TABLE `referral_visits` (
	`referrer_id` text NOT NULL,
	`campaign_id` text NOT NULL,
	`visitor_hash` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`referrer_id`, `campaign_id`, `visitor_hash`)
);
--> statement-breakpoint
CREATE TABLE `saves` (
	`user_id` text NOT NULL,
	`campaign_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`user_id`, `campaign_id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `shares` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`campaign_id` text NOT NULL,
	`channel` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `shares_user_idx` ON `shares` (`user_id`);--> statement-breakpoint
CREATE INDEX `shares_campaign_idx` ON `shares` (`campaign_id`);--> statement-breakpoint
CREATE TABLE `user_achievements` (
	`user_id` text NOT NULL,
	`code` text NOT NULL,
	`earned_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`user_id`, `code`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text,
	`name` text NOT NULL,
	`bio` text DEFAULT '' NOT NULL,
	`city` text DEFAULT '' NOT NULL,
	`avatar_file_id` text,
	`role` text DEFAULT 'user' NOT NULL,
	`plan` text DEFAULT 'free' NOT NULL,
	`identity_verified_at` integer,
	`interests` text DEFAULT '[]' NOT NULL,
	`referral_code` text NOT NULL,
	`referred_by` text,
	`xp` integer DEFAULT 0 NOT NULL,
	`is_demo` integer DEFAULT false NOT NULL,
	`is_blocked` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_uq` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_ref_uq` ON `users` (`referral_code`);--> statement-breakpoint
CREATE TABLE `verification_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`file_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`reviewer_id` text,
	`review_note` text,
	`reviewed_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verif_user_idx` ON `verification_requests` (`user_id`);--> statement-breakpoint
CREATE TABLE `xp_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`action` text NOT NULL,
	`ref_key` text NOT NULL,
	`xp` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `xp_unique` ON `xp_events` (`user_id`,`action`,`ref_key`);--> statement-breakpoint
CREATE INDEX `xp_user_idx` ON `xp_events` (`user_id`);