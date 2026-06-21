CREATE TABLE `leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`company_name` varchar(255) NOT NULL,
	`address` text NOT NULL,
	`email` varchar(320) NOT NULL,
	`avg_bill_eur` int NOT NULL,
	`status` enum('received','processing','qualified','rejected') NOT NULL DEFAULT 'received',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
