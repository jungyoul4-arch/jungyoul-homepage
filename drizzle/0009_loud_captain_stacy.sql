CREATE INDEX `articles_category_idx` ON `articles` (`category`);--> statement-breakpoint
CREATE INDEX `articles_date_idx` ON `articles` (`date`);--> statement-breakpoint
CREATE INDEX `community_comments_post_id_idx` ON `community_comments` (`post_id`);--> statement-breakpoint
CREATE INDEX `community_posts_session_id_idx` ON `community_posts` (`session_id`);--> statement-breakpoint
CREATE INDEX `community_posts_created_at_idx` ON `community_posts` (`created_at`);