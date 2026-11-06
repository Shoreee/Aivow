CREATE TABLE `xuyu_sessions` (
	`hash` text PRIMARY KEY NOT NULL,
	`world_id` text NOT NULL,
	`person_id` text NOT NULL,
	`owner` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `xuyu_worlds` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`body` text NOT NULL,
	`version` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `xuyu_worlds_code_unique` ON `xuyu_worlds` (`code`);