-- Database usage
-- CREATE DATABASE IF NOT EXISTS project_web;
-- USE project_web;

-- 1. Users & Auth
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE 
    -- 'user', 'admin', 'mechanic'
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id INT,
    role_id INT,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

-- Insert default roles
INSERT INTO roles (name) VALUES ('user'), ('admin'), ('mechanic') ON DUPLICATE KEY UPDATE name=name;

-- 2. Customer Vehicles
CREATE TABLE IF NOT EXISTS cars (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    license_plate VARCHAR(20) NOT NULL UNIQUE,
    brand VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    year INT,
    color VARCHAR(30),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Service/Repair Jobs
CREATE TABLE IF NOT EXISTS repair_jobs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    car_id INT NOT NULL,
    mechanic_id INT, -- Assigned mechanic
    status ENUM('pending', 'checking', 'processing', 'waiting_parts', 'completed', 'delivered') DEFAULT 'pending',
    description TEXT, -- Problem description
    estimated_cost DECIMAL(10, 2) DEFAULT 0.00,
    final_cost DECIMAL(10, 2),
    start_date DATETIME,
    completion_date DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE,
    FOREIGN KEY (mechanic_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 4. Job Photos (Before/After)
CREATE TABLE IF NOT EXISTS repair_photos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    job_id INT NOT NULL,
    photo_url VARCHAR(255) NOT NULL,
    photo_type ENUM('before', 'during', 'after') DEFAULT 'during',
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES repair_jobs(id) ON DELETE CASCADE
);

-- 5. Appointments
CREATE TABLE IF NOT EXISTS appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    car_id INT, -- Optional at first
    appointment_date DATETIME NOT NULL,
    status ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'pending',
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE SET NULL
);

-- 6. Inventory / Parts
CREATE TABLE IF NOT EXISTS inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_name VARCHAR(100) NOT NULL,
    description TEXT,
    quantity INT DEFAULT 0,
    unit_price DECIMAL(10, 2) NOT NULL,
    low_stock_threshold INT DEFAULT 5,
    location VARCHAR(50), -- e.g. Shelf A1
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 7. Repair Parts Usage (Linking Jobs to Inventory)
CREATE TABLE IF NOT EXISTS repair_parts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    job_id INT NOT NULL,
    item_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    price_at_time DECIMAL(10, 2) NOT NULL, -- Price when used, in case inventory price changes
    FOREIGN KEY (job_id) REFERENCES repair_jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES inventory(id)
);
