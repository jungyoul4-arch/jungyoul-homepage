CREATE TABLE `nav_menus` (
	`id` text PRIMARY KEY NOT NULL,
	`parent_id` text,
	`label` text NOT NULL,
	`href` text NOT NULL,
	`sort_order` integer DEFAULT 0
);
