ALTER TABLE `xuyu_sessions` RENAME TO `aivow_sessions`;--> statement-breakpoint
ALTER TABLE `xuyu_worlds` RENAME TO `aivow_worlds`;--> statement-breakpoint
CREATE TABLE `aivow_users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`salt` text NOT NULL,
	`world_id` text NOT NULL,
	`person_id` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `aivow_users_email_unique` ON `aivow_users` (`email`);--> statement-breakpoint
ALTER TABLE `aivow_sessions` ADD `user_id` text;--> statement-breakpoint
DROP INDEX `xuyu_worlds_code_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `aivow_worlds_code_unique` ON `aivow_worlds` (`code`);