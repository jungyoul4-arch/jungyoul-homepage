CREATE TABLE `header_links` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`href` text NOT NULL,
	`icon` text DEFAULT '',
	`sort_order` integer DEFAULT 0
);
