-- ═════════════════════════════════════════════════════════════
-- MicroEscrow Database Schema (MySQL 8.0+)
-- UPI-First Micro-Pledge Platform for College Events
-- With Role-Based Authentication & Authorization
-- ═════════════════════════════════════════════════════════════

-- 1. Create Database if not exists
CREATE DATABASE IF NOT EXISTS `microescrow`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `microescrow`;

-- 2. Users Table (Role-Based Authorization)
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(32) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(191) NOT NULL UNIQUE,
  `roll_no` VARCHAR(50) NULL COMMENT 'Student roll number if student',
  `phone` VARCHAR(20) NULL,
  `role` ENUM('student', 'organizer') NOT NULL DEFAULT 'student',
  `password` VARCHAR(255) NOT NULL,
  `department` VARCHAR(100) NULL,
  `created_at` BIGINT NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_users_role` (`role`),
  INDEX `idx_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Campaigns Table
CREATE TABLE IF NOT EXISTS `campaigns` (
  `id` VARCHAR(32) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `target_amount` DECIMAL(12, 2) NOT NULL,
  `category` VARCHAR(100) NOT NULL DEFAULT 'Other',
  `deadline` BIGINT NOT NULL COMMENT 'Deadline timestamp in epoch milliseconds',
  `description` TEXT,
  `status` ENUM('funding', 'disbursed', 'refunded') NOT NULL DEFAULT 'funding',
  `created_at` BIGINT NOT NULL COMMENT 'Creation timestamp in epoch milliseconds',
  PRIMARY KEY (`id`),
  INDEX `idx_campaigns_status` (`status`),
  INDEX `idx_campaigns_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Pledges Table (Escrow Transactions)
CREATE TABLE IF NOT EXISTS `pledges` (
  `id` VARCHAR(32) NOT NULL,
  `campaign_id` VARCHAR(32) NOT NULL,
  `user_id` VARCHAR(32) NULL COMMENT 'Optional user reference for logged in students',
  `name` VARCHAR(150) NOT NULL,
  `roll_no` VARCHAR(50) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `tier` VARCHAR(100) NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `timestamp` BIGINT NOT NULL COMMENT 'Pledge timestamp in epoch milliseconds',
  `status` VARCHAR(50) NOT NULL DEFAULT 'Escrow Locked',
  `vault_hash` VARCHAR(64) NOT NULL COMMENT 'Cryptographic vault hash receipt ID',
  PRIMARY KEY (`id`),
  INDEX `idx_pledges_campaign` (`campaign_id`),
  INDEX `idx_pledges_user` (`user_id`),
  INDEX `idx_pledges_timestamp` (`timestamp`),
  CONSTRAINT `fk_pledges_campaign`
    FOREIGN KEY (`campaign_id`)
    REFERENCES `campaigns` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Seed Users Data (Student & Organizer Default Accounts)
INSERT IGNORE INTO `users` (`id`, `name`, `email`, `roll_no`, `phone`, `role`, `password`, `department`, `created_at`) VALUES
('USR-STU01', 'Aarav Sharma', 'student@campus.edu', '2026CS101', '9876543210', 'student', 'student123', 'Computer Science', 1791800000000),
('USR-STU02', 'Priya Nair', 'priya@campus.edu', '2026EC045', '9876543211', 'student', 'student123', 'Electronics', 1791850000000),
('USR-ORG01', 'Prof. Vikram Rao', 'organizer@campus.edu', NULL, '9811223344', 'organizer', 'organizer123', 'Tech Fest Committee', 1791800000000);

-- 6. Initial Seed Campaigns
INSERT IGNORE INTO `campaigns` (`id`, `title`, `target_amount`, `category`, `deadline`, `description`, `status`, `created_at`) VALUES
('C-TECHFEST26', 'Annual College Tech Fest 2026 — Early Bird Pass & Merch Combo', 50000.00, 'Tech Fest', 1792400000000, 'Get your early bird pass + exclusive hoodie at locked-in vendor pricing. Funds secured in escrow until minimum threshold is met.', 'funding', 1791800000000),
('C-HACKSWAG26', 'Inter-College Hackathon T-Shirt & Swag Kit', 20000.00, 'Hackathon', 1792100000000, 'Exclusive hackathon swag kit — custom tee, sticker pack, and dev toolkit. Order locked once threshold is hit.', 'funding', 1791900000000);

-- 7. Initial Seed Pledges
INSERT IGNORE INTO `pledges` (`id`, `campaign_id`, `user_id`, `name`, `roll_no`, `phone`, `tier`, `amount`, `timestamp`, `status`, `vault_hash`) VALUES
('PLG-SEED01', 'C-TECHFEST26', 'USR-STU01', 'Aarav Sharma',   '2026CS101', '9876543210', 'VIP + Hoodie Pass', 799.00,   1791850000000, 'Escrow Locked', '#ESC-8921-2026'),
('PLG-SEED02', 'C-TECHFEST26', 'USR-STU02', 'Priya Nair',     '2026EC045', '9876543211', 'General Pass',      299.00,   1791890000000, 'Escrow Locked', '#ESC-4502-2026'),
('PLG-SEED03', 'C-TECHFEST26', NULL,        'Rohan Mehta',    '2026ME078', '9876543212', 'VIP + Hoodie Pass', 799.00,   1791930000000, 'Escrow Locked', '#ESC-7731-2026'),
('PLG-SEED04', 'C-TECHFEST26', NULL,        'Sneha Kulkarni', '2026IT032', '9876543213', 'Custom Amount',     500.00,   1791980000000, 'Escrow Locked', '#ESC-3345-2026'),
('PLG-SEED05', 'C-TECHFEST26', NULL,        'Kavya Reddy',    '2026EE017', '9876543214', 'VIP + Hoodie Pass', 799.00,   1792020000000, 'Escrow Locked', '#ESC-6019-2026'),
('PLG-SEED06', 'C-TECHFEST26', NULL,        'Vikram Singh',   '2026CS155', '9876543215', 'Custom Amount',     35304.00, 1792070000000, 'Escrow Locked', '#ESC-1187-2026'),

('PLG-SEED07', 'C-HACKSWAG26', NULL,        'Ananya Verma',   '2026CS201', '9871111111', 'General Pass',      299.00,   1791920000000, 'Escrow Locked', '#ESC-5501-2026'),
('PLG-SEED08', 'C-HACKSWAG26', NULL,        'Karthik Iyer',   '2026EC112', '9872222222', 'VIP + Hoodie Pass', 799.00,   1791950000000, 'Escrow Locked', '#ESC-2208-2026'),
('PLG-SEED09', 'C-HACKSWAG26', NULL,        'Meera Joshi',    '2026IT066', '9873333333', 'VIP + Hoodie Pass', 799.00,   1791990000000, 'Escrow Locked', '#ESC-9914-2026'),
('PLG-SEED10', 'C-HACKSWAG26', NULL,        'Ravi Patel',     '2026ME099', '9874444444', 'General Pass',      299.00,   1792010000000, 'Escrow Locked', '#ESC-7742-2026'),
('PLG-SEED11', 'C-HACKSWAG26', NULL,        'Diya Gupta',     '2026EE044', '9875555555', 'Custom Amount',     16304.00, 1792050000000, 'Escrow Locked', '#ESC-3356-2026');
