CREATE TABLE `admin` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_username_unique` ON `admin` (`username`);--> statement-breakpoint
CREATE TABLE `articles` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`excerpt` text NOT NULL,
	`content` text DEFAULT '',
	`category` text NOT NULL,
	`category_label` text NOT NULL,
	`thumbnail` text DEFAULT '',
	`date` text NOT NULL,
	`slug` text NOT NULL,
	`featured` integer DEFAULT false,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `articles_slug_unique` ON `articles` (`slug`);--> statement-breakpoint
CREATE TABLE `highlights` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`thumbnail` text DEFAULT '',
	`slug` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `highlights_slug_unique` ON `highlights` (`slug`);--> statement-breakpoint
CREATE TABLE `site_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text
);
--> statement-breakpoint
CREATE TABLE `teachers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`subject` text NOT NULL,
	`photo` text DEFAULT '',
	`slug` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `teachers_slug_unique` ON `teachers` (`slug`);--> statement-breakpoint
CREATE TABLE `videos` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`youtube_id` text NOT NULL,
	`thumbnail` text DEFAULT '',
	`sort_order` integer DEFAULT 0
);
