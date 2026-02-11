-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Server version:               8.0.44 - MySQL Community Server - GPL
-- Server OS:                    Linux
-- HeidiSQL Version:             12.13.0.7147
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Dumping database structure for bt_auto
CREATE DATABASE IF NOT EXISTS `bt_auto` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `bt_auto`;

-- Dumping structure for table bt_auto.cars
CREATE TABLE IF NOT EXISTS `cars` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `brand` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `model` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `year` year NOT NULL,
  `license_plate` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `vin` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `image_url` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `cars_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table bt_auto.cars: ~0 rows (approximately)
REPLACE INTO `cars` (`id`, `user_id`, `brand`, `model`, `year`, `license_plate`, `vin`, `image_url`, `created_at`, `updated_at`) VALUES
	(1, 3, 'Ferrari 849 Testarossa', '-', '2025', '123AD', '1HG', '/uploads/cars/1770824415428.webp', '2026-02-11 15:40:15', '2026-02-11 15:40:15'),
	(2, 4, 'Honda ', 'Civic', '2026', 'พะเยา 99', '1MG', '/uploads/cars/1770824867379.webp', '2026-02-11 15:47:47', '2026-02-11 15:47:47'),
	(3, 6, 'Tesla', 'S Plaid', '2025', 'กรุงเทพมหานคร 555', '110', '/uploads/cars/1770825095734.jpg', '2026-02-11 15:51:35', '2026-02-11 15:51:35'),
	(4, 3, 'Honda', 'Civic', '2025', 'ตาก 675', '2GG', '/uploads/cars/1770825510936.webp', '2026-02-11 15:58:30', '2026-02-11 15:58:30');

-- Dumping structure for table bt_auto.history
CREATE TABLE IF NOT EXISTS `history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `car_id` int NOT NULL,
  `service_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `service_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `car_id` (`car_id`),
  CONSTRAINT `history_ibfk_1` FOREIGN KEY (`car_id`) REFERENCES `cars` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table bt_auto.history: ~0 rows (approximately)

-- Dumping structure for table bt_auto.inventory
CREATE TABLE IF NOT EXISTS `inventory` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `sku` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` int NOT NULL DEFAULT '0',
  `min_quantity` int NOT NULL DEFAULT '5',
  `cost_price` decimal(10,2) NOT NULL DEFAULT '0.00',
  `selling_price` decimal(10,2) NOT NULL DEFAULT '0.00',
  `supplier` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `image_url` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sku` (`sku`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table bt_auto.inventory: ~0 rows (approximately)
REPLACE INTO `inventory` (`id`, `name`, `sku`, `category`, `quantity`, `min_quantity`, `cost_price`, `selling_price`, `supplier`, `image_url`, `created_at`, `updated_at`) VALUES
	(1, 'ยางรถยนต์', 'Tyre', 'ช่วงล่าง', 7, 5, 10000.00, 12000.00, 'bt_auto', '/uploads/inventory/1770824560573.jpg', '2026-02-11 15:42:40', '2026-02-11 15:59:09'),
	(2, 'แม็ก', 'MAX', 'ช่วงล่าง', 3, 5, 32000.00, 32500.00, 'bt_auto', '/uploads/inventory/1770824667867.jpg', '2026-02-11 15:44:27', '2026-02-11 15:48:28');

-- Dumping structure for table bt_auto.roles
CREATE TABLE IF NOT EXISTS `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table bt_auto.roles: ~2 rows (approximately)
REPLACE INTO `roles` (`id`, `name`) VALUES
	(1, 'user'),
	(2, 'admin');

-- Dumping structure for table bt_auto.user_roles
CREATE TABLE IF NOT EXISTS `user_roles` (
  `user_id` int NOT NULL,
  `role_id` int NOT NULL,
  `assigned_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`,`role_id`),
  KEY `role_id` (`role_id`),
  CONSTRAINT `user_roles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_roles_ibfk_2` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table bt_auto.user_roles: ~1 rows (approximately)
REPLACE INTO `user_roles` (`user_id`, `role_id`, `assigned_at`) VALUES
	(1, 2, '2026-02-11 15:01:14'),
	(2, 1, '2026-02-11 15:35:52'),
	(3, 1, '2026-02-11 15:36:18'),
	(4, 1, '2026-02-11 15:36:56'),
	(5, 1, '2026-02-11 15:37:35'),
	(6, 1, '2026-02-11 15:38:01'),
	(7, 1, '2026-02-11 15:38:21');

-- Dumping structure for table bt_auto.users
CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `first_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table bt_auto.users: ~7 rows (approximately)
REPLACE INTO `users` (`id`, `username`, `password_hash`, `email`, `first_name`, `last_name`, `phone`, `created_at`, `updated_at`) VALUES
	(1, 'admin', '$2b$10$FMuKVxPn0BnMLg6bowW1Wu7fmsyD3tSKm48wUuE9B0C2mGwNPXEKW', 'admin@gmail.com', 'admin', 'admin', '0', '2026-02-11 15:01:14', '2026-02-11 15:01:14'),
	(2, '0987654321', '$2b$10$rZMU8O6CWjRtWWosl8AB1.vnyLEssuD/6R27OH1r8.akhwAjEOtU2', 'rakdee@gmail.com', 'รักดี', 'สุดใจ', '0987654321', '2026-02-11 15:35:52', '2026-02-11 15:35:52'),
	(3, '098777666', '$2b$10$Q7LOouyoPoqkMH5aYOUUkOgE3YKVzslcpn.5kpKyx6W4XgXDLwoa2', 'somsri@gmail.com', 'สมศรี', 'มีให้เห็น', '098777666', '2026-02-11 15:36:18', '2026-02-11 15:36:18'),
	(4, '099999999', '$2b$10$Ut24rq8gfOQM.isblSwMWuhtHjfel0PF/HkczA7s38.fViqAc5rbW', 'rakkrai@gmail.com', 'รักใคร', 'ไม่เป็น', '099999999', '2026-02-11 15:36:56', '2026-02-11 15:36:56'),
	(5, '0837162332', '$2b$10$Dda7vz6jClIVjMm/itHdber5TF8e72Zl.Dvhj9xEh/A9CXMtx/jdu', 'whereissomsri@gmail.com', 'สมศรี', 'มีไหน', '0837162332', '2026-02-11 15:37:35', '2026-02-11 15:37:35'),
	(6, '0112345672', '$2b$10$ROZrMEUCpl8VLXUWOUHKxeC3JVNXhaBSmFnM6OuojXezEgDKdM/OS', 'rukter@gmail.com', 'รักเธอ', 'จังเลย', '0112345672', '2026-02-11 15:38:01', '2026-02-11 15:38:01'),
	(7, '0123334442', '$2b$10$dg50X4dw8ycJpgsPW1QDV.g.l0QiZXcP.ga/8BHfpE3cb6t6/MkLC', 'reandee@gmail.com', 'เรียนดี', 'มีชัย', '0123334442', '2026-02-11 15:38:21', '2026-02-11 15:38:21');

-- Dumping structure for table bt_auto.work_order_history
CREATE TABLE IF NOT EXISTS `work_order_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_order_id` int NOT NULL,
  `status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `work_order_id` (`work_order_id`),
  CONSTRAINT `work_order_history_ibfk_1` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table bt_auto.work_order_history: ~0 rows (approximately)
REPLACE INTO `work_order_history` (`id`, `work_order_id`, `status`, `created_at`, `updated_by`) VALUES
	(1, 1, 'pending', '2026-02-11 15:45:08', NULL),
	(2, 1, 'checking', '2026-02-11 15:45:24', NULL),
	(3, 1, 'waiting_parts', '2026-02-11 15:45:28', NULL),
	(4, 1, 'ready_for_pickup', '2026-02-11 15:45:32', NULL),
	(5, 1, 'completed', '2026-02-11 15:45:39', NULL),
	(6, 2, 'checking', '2026-02-11 15:48:21', NULL),
	(7, 2, 'waiting_parts', '2026-02-11 15:48:28', NULL),
	(8, 3, 'checking', '2026-02-11 15:53:06', NULL),
	(9, 3, 'ready_for_pickup', '2026-02-11 15:53:40', NULL),
	(10, 4, 'checking', '2026-02-11 15:59:02', NULL),
	(11, 4, 'repairing', '2026-02-11 15:59:09', NULL);

-- Dumping structure for table bt_auto.work_order_items
CREATE TABLE IF NOT EXISTS `work_order_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_order_id` int NOT NULL,
  `inventory_id` int DEFAULT NULL,
  `item_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `unit_price` decimal(10,2) NOT NULL DEFAULT '0.00',
  `total_price` decimal(10,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `work_order_id` (`work_order_id`),
  KEY `inventory_id` (`inventory_id`),
  CONSTRAINT `work_order_items_ibfk_1` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `work_order_items_ibfk_2` FOREIGN KEY (`inventory_id`) REFERENCES `inventory` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table bt_auto.work_order_items: ~0 rows (approximately)
REPLACE INTO `work_order_items` (`id`, `work_order_id`, `inventory_id`, `item_name`, `quantity`, `unit_price`, `total_price`, `created_at`) VALUES
	(6, 1, 1, 'ยางรถยนต์', 1, 12000.00, 12000.00, '2026-02-11 15:45:39'),
	(9, 2, 2, 'แม็ก', 1, 32500.00, 32500.00, '2026-02-11 15:48:28'),
	(10, 2, NULL, 'แรง', 1, 500.00, 500.00, '2026-02-11 15:48:28'),
	(12, 3, 1, 'ยางรถยนต์', 1, 12000.00, 12000.00, '2026-02-11 15:53:40'),
	(14, 4, 1, 'ยางรถยนต์', 1, 12000.00, 12000.00, '2026-02-11 15:59:09');

-- Dumping structure for table bt_auto.work_orders
CREATE TABLE IF NOT EXISTS `work_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `car_id` int NOT NULL,
  `service_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` enum('pending','checking','waiting_parts','repairing','completed','ready_for_pickup') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `appointment_date` datetime DEFAULT NULL,
  `start_date` datetime DEFAULT NULL,
  `end_date` datetime DEFAULT NULL,
  `cost` decimal(10,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `car_id` (`car_id`),
  CONSTRAINT `work_orders_ibfk_1` FOREIGN KEY (`car_id`) REFERENCES `cars` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table bt_auto.work_orders: ~0 rows (approximately)
REPLACE INTO `work_orders` (`id`, `car_id`, `service_type`, `description`, `status`, `appointment_date`, `start_date`, `end_date`, `cost`, `created_at`, `updated_at`) VALUES
	(1, 1, 'เปลี่ยนยางรถ', '', 'completed', '2026-02-10 00:00:00', NULL, NULL, 12000.00, '2026-02-11 15:45:08', '2026-02-11 15:45:39'),
	(2, 2, 'เปลี่ยนแม็ก', '', 'waiting_parts', '2026-02-11 00:00:00', NULL, NULL, 33000.00, '2026-02-11 15:48:21', '2026-02-11 15:48:28'),
	(3, 3, 'เปลี่ยนล้อ', 'ตะปูแทงล้อ', 'ready_for_pickup', '2026-02-14 00:00:00', NULL, NULL, 12000.00, '2026-02-11 15:53:06', '2026-02-11 15:53:40'),
	(4, 4, 'เปลี่ยนล้อแม็ก', '', 'repairing', '2026-02-11 00:00:00', NULL, NULL, 12000.00, '2026-02-11 15:59:02', '2026-02-11 15:59:09');

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
