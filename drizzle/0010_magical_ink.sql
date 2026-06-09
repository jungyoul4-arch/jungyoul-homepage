CREATE TABLE `picture_frame_items` (
	`id` text PRIMARY KEY NOT NULL,
	`media_type` text NOT NULL,
	`image_url` text DEFAULT '',
	`youtube_id` text DEFAULT '',
	`duration_sec` integer DEFAULT 7,
	`sort_order` integer DEFAULT 0,
	`created_at` text
);
--> statement-breakpoint
CREATE INDEX `picture_frame_items_sort_order_idx` ON `picture_frame_items` (`sort_order`);