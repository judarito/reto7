CREATE TABLE `trophies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`challenge_id` integer NOT NULL,
	`earned_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`challenge_id`) REFERENCES `challenges`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `challenges` ADD `is_premium` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `challenges` ADD `price` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `users` ADD `streak_freezes_inventory` integer DEFAULT 0;