ALTER TABLE `challenges` ADD `creator_id` integer REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `challenges` ADD `is_private` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `challenges` ADD `invite_code` text;--> statement-breakpoint
CREATE UNIQUE INDEX `challenges_invite_code_unique` ON `challenges` (`invite_code`);