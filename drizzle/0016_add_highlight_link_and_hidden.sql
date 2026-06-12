ALTER TABLE `articles` ADD `hidden` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `highlights` ADD `link_url` text DEFAULT '';--> statement-breakpoint
ALTER TABLE `html_pages` ADD `hidden` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `url_pages` ADD `hidden` integer DEFAULT false;