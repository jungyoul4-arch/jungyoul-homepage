-- pinned_articles: 과거 수동 SQL 로 운영에 이미 생성되었을 수 있어 IF NOT EXISTS
CREATE TABLE IF NOT EXISTS `pinned_articles` (
	`slot` integer PRIMARY KEY NOT NULL,
	`article_id` text NOT NULL
);
--> statement-breakpoint
-- articles.category CHECK 제약 제거 (SQLite 는 ALTER 로 CHECK 수정 불가 → 테이블 재구축)
PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `__new_articles` (
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
INSERT INTO `__new_articles`(`id`, `title`, `excerpt`, `content`, `category`, `category_label`, `thumbnail`, `date`, `slug`, `featured`, `created_at`, `updated_at`) SELECT `id`, `title`, `excerpt`, `content`, `category`, `category_label`, `thumbnail`, `date`, `slug`, `featured`, `created_at`, `updated_at` FROM `articles`;
--> statement-breakpoint
DROP TABLE `articles`;
--> statement-breakpoint
ALTER TABLE `__new_articles` RENAME TO `articles`;
--> statement-breakpoint
CREATE UNIQUE INDEX `articles_slug_unique` ON `articles` (`slug`);
--> statement-breakpoint
PRAGMA foreign_keys=ON;
