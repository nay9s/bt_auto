-- Add a sample car for user with ID 1 (Assuming you have registered a user and their ID is 1)
INSERT INTO `cars` (`user_id`, `brand`, `model`, `year`, `license_plate`, `image_url`) VALUES
(1, 'Toyota', 'Camry', 2018, '1กก-9999', 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/2018_Toyota_Camry_%28ASV70R%29_Ascent_sedan_%282018-08-27%29_01.jpg/640px-2018_Toyota_Camry_%28ASV70R%29_Ascent_sedan_%282018-08-27%29_01.jpg');

-- Get the ID of the car we just inserted (Should be 1 if it's the first car)
-- Add a sample work order for that car
INSERT INTO `work_orders` (`car_id`, `service_type`, `description`, `status`, `appointment_date`, `created_at`) VALUES
(1, 'เช็คระยะ 10,000 กม.', 'เปลี่ยนถ่ายน้ำมันเครื่อง และไส้กรอง', 'repairing', '2025-11-15 09:00:00', NOW());

-- Add another completed work order for history
INSERT INTO `work_orders` (`car_id`, `service_type`, `description`, `status`, `appointment_date`, `created_at`) VALUES
(1, 'เปลี่ยนยาง', 'เปลี่ยนยาง 4 เส้น', 'completed', '2025-08-20 10:00:00', '2025-08-20 10:00:00');

-- Add sample history items
INSERT INTO `history` (`car_id`, `service_type`, `service_date`) VALUES
(1, 'เปลี่ยนแบตเตอรี่', '2025-01-10 10:30:00'),
(1, 'ล้างแอร์', '2024-12-05 14:00:00'),
(1, 'ปะยาง', '2024-10-20 09:15:00');
