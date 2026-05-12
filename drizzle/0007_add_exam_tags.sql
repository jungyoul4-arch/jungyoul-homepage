CREATE TABLE `exam_tag_options` (
	`id` text PRIMARY KEY NOT NULL,
	`tag_type` text NOT NULL,
	`value` text NOT NULL,
	`sort_order` integer DEFAULT 0
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exam_tag_options_type_value_idx` ON `exam_tag_options` (`tag_type`,`value`);--> statement-breakpoint
ALTER TABLE `articles` ADD `exam_year` text DEFAULT '';--> statement-breakpoint
ALTER TABLE `articles` ADD `exam_grade` text DEFAULT '';--> statement-breakpoint
ALTER TABLE `articles` ADD `exam_subject` text DEFAULT '';--> statement-breakpoint
INSERT OR IGNORE INTO `exam_tag_options` (`id`,`tag_type`,`value`,`sort_order`) VALUES
	('seed-year-2026','year','2026',0),
	('seed-grade-1','grade','고1',0),
	('seed-grade-2','grade','고2',1),
	('seed-grade-3','grade','고3',2),
	('seed-subject-kor','subject','국어',0),
	('seed-subject-eng','subject','영어',1),
	('seed-subject-mat','subject','수학',2),
	('seed-subject-sci','subject','과학',3);