CREATE TABLE `hero_slide_items` (
	`id` text PRIMARY KEY NOT NULL,
	`slide_id` text NOT NULL,
	`article_id` text NOT NULL,
	`role` text NOT NULL,
	`sort_order` integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `hero_slides` (
	`id` text PRIMARY KEY NOT NULL,
	`sort_order` integer DEFAULT 0,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE TABLE `tracking_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`position` text NOT NULL,
	`enabled` integer DEFAULT true,
	`created_at` text
);
