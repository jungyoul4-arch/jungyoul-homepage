CREATE TABLE `html_pages` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`excerpt` text DEFAULT '',
	`category_label` text DEFAULT '페이지',
	`content` text NOT NULL,
	`thumbnail` text DEFAULT '',
	`thumbnail_overlays` text DEFAULT '',
	`date` text NOT NULL,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `html_pages_slug_unique` ON `html_pages` (`slug`);--> statement-breakpoint
CREATE INDEX `html_pages_date_idx` ON `html_pages` (`date`);