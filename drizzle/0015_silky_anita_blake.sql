CREATE TABLE `url_pages` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`excerpt` text DEFAULT '',
	`category` text DEFAULT '',
	`category_label` text DEFAULT '링크',
	`external_url` text NOT NULL,
	`thumbnail` text DEFAULT '',
	`thumbnail_overlays` text DEFAULT '',
	`date` text NOT NULL,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE INDEX `url_pages_date_idx` ON `url_pages` (`date`);