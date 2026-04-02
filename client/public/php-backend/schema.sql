-- ============================================================
-- HR Connect — MySQL Schema
-- For SpeedCloud / IIS deployment
-- Version: 1.0  |  PHP + MySQL backend
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';

-- ── Database (create if not exists) ──────────────────────────────────────────
CREATE DATABASE IF NOT EXISTS `hrconnect`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `hrconnect`;

-- ── Units ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `units` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(255) NOT NULL,
  `code`        VARCHAR(100) NOT NULL,
  `description` TEXT         DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_units_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Departments ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `departments` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(255) NOT NULL,
  `code`        VARCHAR(100) NOT NULL,
  `manager`     VARCHAR(255) DEFAULT NULL,
  `location`    VARCHAR(255) DEFAULT NULL,
  `description` TEXT         DEFAULT NULL,
  `unit_id`     INT UNSIGNED DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_departments_name` (`name`),
  CONSTRAINT `fk_dept_unit` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Users / Employees ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `users` (
  `id`                     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `employee_id`            VARCHAR(100)  DEFAULT NULL,
  `username`               VARCHAR(150)  NOT NULL,
  `password`               VARCHAR(255)  NOT NULL,
  `email`                  VARCHAR(255)  NOT NULL,
  `first_name`             VARCHAR(150)  NOT NULL,
  `last_name`              VARCHAR(150)  NOT NULL,
  `date_of_birth`          DATETIME      DEFAULT NULL,
  `gender`                 ENUM('male','female','other','prefer_not_to_say') DEFAULT NULL,
  `marital_status`         ENUM('single','married','divorced','widowed','prefer_not_to_say') DEFAULT NULL,
  `photo_url`              TEXT          DEFAULT NULL,
  `role`                   ENUM('admin','hr','manager','employee','developer') NOT NULL DEFAULT 'employee',
  `department_id`          INT UNSIGNED  DEFAULT NULL,
  `position`               VARCHAR(255)  DEFAULT NULL,
  `join_date`              DATETIME      DEFAULT CURRENT_TIMESTAMP,
  `work_location`          VARCHAR(255)  DEFAULT NULL,
  `reporting_to`           INT UNSIGNED  DEFAULT NULL,
  `phone_number`           VARCHAR(50)   DEFAULT NULL,
  `address`                TEXT          DEFAULT NULL,
  `uan_number`             VARCHAR(100)  DEFAULT NULL,
  `esic_number`            VARCHAR(100)  DEFAULT NULL,
  `aadhaar_card`           VARCHAR(100)  DEFAULT NULL,
  `pan_card`               VARCHAR(50)   DEFAULT NULL,
  `employment_type`        VARCHAR(50)   DEFAULT 'permanent',
  `pf_applicable`          TINYINT(1)    NOT NULL DEFAULT 1,
  `esic_applicable`        TINYINT(1)    NOT NULL DEFAULT 1,
  `pt_applicable`          TINYINT(1)    NOT NULL DEFAULT 1,
  `income_tax_applicable`  TINYINT(1)    NOT NULL DEFAULT 0,
  `mlwf_applicable`        TINYINT(1)    NOT NULL DEFAULT 0,
  `overtime_applicable`    TINYINT(1)    NOT NULL DEFAULT 0,
  `bonus_applicable`       TINYINT(1)    NOT NULL DEFAULT 0,
  `bank_name`              VARCHAR(255)  DEFAULT NULL,
  `bank_account_number`    VARCHAR(100)  DEFAULT NULL,
  `bank_ifsc_code`         VARCHAR(20)   DEFAULT NULL,
  `bank_account_type`      ENUM('savings','current','salary') DEFAULT NULL,
  `salary`                 INT           DEFAULT NULL,
  `is_active`              TINYINT(1)    NOT NULL DEFAULT 1,
  `status`                 ENUM('invited','active','inactive') NOT NULL DEFAULT 'active',
  `custom_permissions`     JSON          DEFAULT NULL,
  `documents`              JSON          DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_username` (`username`),
  UNIQUE KEY `uq_users_email`    (`email`),
  UNIQUE KEY `uq_users_empid`    (`employee_id`),
  CONSTRAINT `fk_users_dept` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Employee Invitations ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `employee_invitations` (
  `id`             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `token`          VARCHAR(64)  NOT NULL,
  `email`          VARCHAR(255) NOT NULL,
  `first_name`     VARCHAR(150) NOT NULL,
  `last_name`      VARCHAR(150) NOT NULL,
  `invited_by_id`  INT UNSIGNED NOT NULL,
  `expires_at`     DATETIME     NOT NULL,
  `used_at`        DATETIME     DEFAULT NULL,
  `created_at`     DATETIME     DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_invitations_token` (`token`),
  CONSTRAINT `fk_inv_user` FOREIGN KEY (`invited_by_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Attendance Records ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `attendance_records` (
  `id`             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`        INT UNSIGNED NOT NULL,
  `check_in_time`  DATETIME     DEFAULT NULL,
  `check_out_time` DATETIME     DEFAULT NULL,
  `date`           DATETIME     DEFAULT CURRENT_TIMESTAMP,
  `status`         ENUM('present','absent','halfday','late') NOT NULL DEFAULT 'present',
  `notes`          TEXT         DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_att_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Leave Requests ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `leave_requests` (
  `id`             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`        INT UNSIGNED NOT NULL,
  `type`           ENUM('annual','sick','personal','halfday','unpaid','other','workfromhome') NOT NULL,
  `start_date`     DATETIME     NOT NULL,
  `end_date`       DATETIME     NOT NULL,
  `reason`         TEXT         DEFAULT NULL,
  `status`         ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `approved_by_id` INT UNSIGNED DEFAULT NULL,
  `created_at`     DATETIME     DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_lr_user`     FOREIGN KEY (`user_id`)        REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_lr_approver` FOREIGN KEY (`approved_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Holidays ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `holidays` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(255) NOT NULL,
  `date`        DATETIME     NOT NULL,
  `description` TEXT         DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Notifications ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `notifications` (
  `id`               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`          INT UNSIGNED NOT NULL,
  `type`             ENUM('login','logout','leave_request','leave_approved','leave_rejected') NOT NULL,
  `title`            VARCHAR(255) NOT NULL,
  `message`          TEXT         NOT NULL,
  `is_read`          TINYINT(1)   NOT NULL DEFAULT 0,
  `created_at`       DATETIME     DEFAULT CURRENT_TIMESTAMP,
  `related_user_id`  INT UNSIGNED DEFAULT NULL,
  `related_leave_id` INT UNSIGNED DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_notif_user`    FOREIGN KEY (`user_id`)          REFERENCES `users`         (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_notif_reluser` FOREIGN KEY (`related_user_id`)  REFERENCES `users`         (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_notif_leave`   FOREIGN KEY (`related_leave_id`) REFERENCES `leave_requests`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Payment Records ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `payment_records` (
  `id`             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `employee_id`    INT UNSIGNED NOT NULL,
  `month`          VARCHAR(20)  NOT NULL,
  `payment_status` ENUM('pending','paid') NOT NULL DEFAULT 'pending',
  `amount`         INT          NOT NULL,
  `payment_date`   DATETIME     DEFAULT NULL,
  `payment_mode`   ENUM('bank_transfer','cheque','cash','upi') DEFAULT NULL,
  `reference_no`   VARCHAR(255) DEFAULT NULL,
  `created_at`     DATETIME     DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_pr_emp` FOREIGN KEY (`employee_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Bank Masters ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `bank_masters` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `bank_name`   VARCHAR(255) NOT NULL,
  `branch`      VARCHAR(255) NOT NULL,
  `branch_code` VARCHAR(100) DEFAULT NULL,
  `address`     TEXT         DEFAULT NULL,
  `account_no`  VARCHAR(100) DEFAULT NULL,
  `ifsc_code`   VARCHAR(20)  DEFAULT NULL,
  `micr_code`   VARCHAR(20)  DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Category Masters ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `category_masters` (
  `id`                   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `category_description` VARCHAR(255) NOT NULL,
  `class`                VARCHAR(100) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Company Masters ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `company_masters` (
  `id`                        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `company_code`              VARCHAR(50)  NOT NULL,
  `company_name`              VARCHAR(255) NOT NULL,
  `address`                   TEXT         DEFAULT NULL,
  `state`                     VARCHAR(100) DEFAULT NULL,
  `pin_code`                  VARCHAR(20)  DEFAULT NULL,
  `regd_no`                   VARCHAR(100) DEFAULT NULL,
  `pfc_code`                  VARCHAR(50)  DEFAULT NULL,
  `esic_code`                 VARCHAR(50)  DEFAULT NULL,
  `pan_no`                    VARCHAR(20)  DEFAULT NULL,
  `tan_no`                    VARCHAR(20)  DEFAULT NULL,
  `gst_no`                    VARCHAR(20)  DEFAULT NULL,
  `email`                     VARCHAR(255) DEFAULT NULL,
  `nature_of_business`        VARCHAR(255) DEFAULT NULL,
  `esi_employee_contribution` VARCHAR(20)  DEFAULT NULL,
  `esi_employer_contribution` VARCHAR(20)  DEFAULT NULL,
  `pf_employer_contribution`  VARCHAR(20)  DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Cost Centers ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `cost_centers` (
  `id`   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Document Approvals ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `document_approvals` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `document_type` VARCHAR(255) NOT NULL,
  `approver_id`   INT UNSIGNED NOT NULL,
  `status`        VARCHAR(50)  NOT NULL DEFAULT 'pending',
  `remarks`       TEXT         DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_da_approver` FOREIGN KEY (`approver_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Employee Deductions ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `employee_deductions` (
  `id`             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `employee_id`    INT UNSIGNED NOT NULL,
  `deduction_type` VARCHAR(100) NOT NULL,
  `amount`         INT          NOT NULL DEFAULT 0,
  `month`          VARCHAR(20)  NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_ed_emp` FOREIGN KEY (`employee_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ── Default Admin User ────────────────────────────────────────────────────────
-- Password: Admin@1234  (bcrypt hash — change this after first login)
INSERT IGNORE INTO `users`
  (username, password, email, first_name, last_name, role, status, is_active, join_date)
VALUES
  (
    'admin',
    '$2y$12$Q3j2M6xV8LpN9FkGtR1HwOY8aB4dCeE5fGhIiJkKlMnOpQrStUvWx',
    'admin@hrconnect.com',
    'Admin',
    'User',
    'admin',
    'active',
    1,
    NOW()
  );

-- NOTE: The hash above is a placeholder. Run `setup.php` to create the real admin
-- account with a proper bcrypt hash, or use the seed script below:

-- To generate a fresh bcrypt hash in PHP:
--   echo password_hash('Admin@1234', PASSWORD_DEFAULT);
-- Then UPDATE users SET password='<new_hash>' WHERE username='admin';
