CREATE TABLE `alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`partnerId` varchar(255) NOT NULL,
	`skuId` varchar(255),
	`alertType` enum('order_decline','churn_risk','volatility_spike','warehouse_anomaly','sku_churn','concentration_risk') NOT NULL,
	`severity` enum('low','medium','high','critical') NOT NULL,
	`timeframe` enum('7d','30d') NOT NULL,
	`message` text NOT NULL,
	`benchmarkValue` varchar(255),
	`currentValue` varchar(255),
	`percentageChange` varchar(50),
	`direction` varchar(10),
	`isResolved` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `benchmarks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`partnerId` varchar(255) NOT NULL,
	`skuId` varchar(255),
	`metricType` enum('avg_orders_per_day','order_interval','volatility','warehouse_count','sku_count','orders_per_sku') NOT NULL,
	`period` enum('7d','30d','90d','all') NOT NULL,
	`value` varchar(255) NOT NULL,
	`direction` varchar(10),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `benchmarks_id` PRIMARY KEY(`id`)
);
