CREATE TABLE `community_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`session_id` text NOT NULL,
	`nickname_snapshot` text NOT NULL,
	`body` text NOT NULL,
	`is_deleted` integer DEFAULT false,
	`created_at` text
);
--> statement-breakpoint
CREATE TABLE `community_post_likes` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`session_id` text NOT NULL,
	`created_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `community_post_likes_post_session_idx` ON `community_post_likes` (`post_id`,`session_id`);--> statement-breakpoint
CREATE TABLE `community_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`nickname_snapshot` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`image_url` text DEFAULT '',
	`tag` text DEFAULT '',
	`like_count` integer DEFAULT 0,
	`comment_count` integer DEFAULT 0,
	`is_deleted` integer DEFAULT false,
	`created_at` text
);
--> statement-breakpoint
CREATE TABLE `community_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`nickname` text NOT NULL,
	`created_at` text,
	`last_seen_at` text
);
--> statement-breakpoint
CREATE TABLE `community_tags` (
	`id` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`sort_order` integer DEFAULT 0
);
--> statement-breakpoint
CREATE UNIQUE INDEX `community_tags_value_idx` ON `community_tags` (`value`);--> statement-breakpoint
INSERT OR IGNORE INTO `community_tags` (`id`,`value`,`sort_order`) VALUES
	('seed-tag-suneung','수능',0),
	('seed-tag-naesin','내신',1),
	('seed-tag-nonsul','논술',2),
	('seed-tag-jinro','진로',3),
	('seed-tag-gomin','고민',4),
	('seed-tag-japdam','잡담',5);