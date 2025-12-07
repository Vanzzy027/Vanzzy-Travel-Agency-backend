
-- -- Users Table

-- CREATE TABLE Users (  -- will add a column for national id, incase you mess you get banned
--     user_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
--     first_name NVARCHAR(50) NOT NULL,
--     last_name NVARCHAR(50) NOT NULL,
--     email NVARCHAR(100) NOT NULL UNIQUE,
--     password NVARCHAR(255) NOT NULL, 
--     contact_phone NVARCHAR(20) NOT NULL,
--     address NVARCHAR(255) NULL,
--     photo NVARCHAR(255) NULL, 
--     role NVARCHAR(20) DEFAULT 'user' NOT NULL, 
--     status NVARCHAR(20) DEFAULT 'active' NOT NULL,
--     verified BIT DEFAULT 0 NOT NULL, 
--     otp_code NVARCHAR(10) NULL,
--     otp_expires_at DATETIME2 NULL,
--     created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
--     updated_at DATETIME2 NULL,
--     national_id VARCHAR(20) NOT NULL UNIQUE,
    
--     CONSTRAINT CK_Users_Status CHECK (status IN ('active', 'inactive', 'banned')),
--     CONSTRAINT CK_Users_Role CHECK (role IN ('superAdmin', 'admin', 'user'))
-- );
-- GO

-- select * from Users


-- -- Vehicle Specifications Table
-- CREATE TABLE VehicleSpecifications (
--     vehicleSpec_id INT IDENTITY(1,1) PRIMARY KEY,
--     manufacturer NVARCHAR(50) NOT NULL,
--     model NVARCHAR(50) NOT NULL,
--     year INT NOT NULL,
--     fuel_type NVARCHAR(20) NOT NULL, 
--     engine_capacity NVARCHAR(20),
--     transmission NVARCHAR(20) NOT NULL, 
--     seating_capacity INT NOT NULL,
--     color NVARCHAR(30),
--     features NVARCHAR(MAX), 
--     images NVARCHAR(MAX) NULL -- images iN aray form so i can have multiple ie even the interior
-- );
-- GO


-- -- specs optimization
-- ALTER TABLE VehicleSpecifications
-- ADD 
--     on_promo BIT DEFAULT 0 NOT NULL, 
--     review_count INT DEFAULT 0,
--     vehicle_type NVARCHAR(30) NOT NULL DEFAULT 'Sedan',
--     fuel_efficiency NVARCHAR(20) NULL,
--     daily_rate DECIMAL(10,2) NULL,
--     weekly_rate DECIMAL(10,2) NULL,
--     monthly_rate DECIMAL(10,2) NULL,
--     insurance_group NVARCHAR(20) NULL,
--     CONSTRAINT CK_Vehicle_Type CHECK (vehicle_type IN ('Sedan', 'SUV', 'Truck', 'Van', 'Hatchback', 'Coupe', 'Convertible', 'Minivan', 'Sports Car')),
--     CONSTRAINT CK_Fuel_Type CHECK (fuel_type IN ('Petrol', 'Diesel', 'Electric', 'Hybrid', 'CNG', 'LPG'));


--     -- promo fields to VehicleSpecifications
-- ALTER TABLE VehicleSpecifications
-- ADD 
--     promo_rate DECIMAL(10, 2) NULL,
--     promo_start_date DATETIME2 NULL,
--     promo_end_date DATETIME2 NULL;

-- -- Vehicles Table 

-- CREATE TABLE Vehicles (
--     vehicle_id INT IDENTITY(1,1) PRIMARY KEY,
--     vehicleSpec_id INT NOT NULL,
--     vin_number NVARCHAR(50) NOT NULL UNIQUE, 
--     license_plate NVARCHAR(20) NOT NULL UNIQUE,
--     current_mileage INT NOT NULL, 
--     rental_rate DECIMAL(10, 2) NOT NULL, 
--     status NVARCHAR(20) DEFAULT 'Available' NOT NULL
--         CONSTRAINT CK_Vehicle_Status CHECK (status IN ('Available', 'Rented', 'Maintenance', 'Unavailable', 'Banned')),
--     created_at DATETIME DEFAULT GETDATE(),
--     updated_at DATETIME DEFAULT GETDATE(),
--     CONSTRAINT FK_Vehicles_Specs FOREIGN KEY (vehicleSpec_id) 
--     REFERENCES VehicleSpecifications(vehicleSpec_id) ON DELETE CASCADE
 
-- );
-- GO







-- -- Bookings Table
-- CREATE TABLE Bookings (
--     booking_id INT IDENTITY(1,1) PRIMARY KEY,
--     user_id UNIQUEIDENTIFIER NOT NULL, 
--     vehicle_id INT NOT NULL,
--     booking_date DATETIME NOT NULL,
--     return_date DATETIME NOT NULL,
--     actual_return_date DATETIME NULL, 
--     start_mileage INT NULL, 
--     end_mileage INT NULL, 
--     total_amount DECIMAL(10, 2) NOT NULL,
--     booking_status NVARCHAR(20) DEFAULT 'Pending', 
--     created_at DATETIME DEFAULT GETDATE(),
--     updated_at DATETIME DEFAULT GETDATE(),
--     CONSTRAINT FK_Bookings_User FOREIGN KEY (user_id) REFERENCES Users(user_id),
--     CONSTRAINT FK_Bookings_Vehicle FOREIGN KEY (vehicle_id) REFERENCES Vehicles(vehicle_id),
--     CONSTRAINT CK_Booking_Status CHECK (booking_status IN ('Pending', 'Confirmed', 'Completed', 'Cancelled', 'Late'))
-- );
-- GO
-- -- insurance and additional charges to Bookings
-- ALTER TABLE Bookings
-- ADD 
--     insurance_fee DECIMAL(10, 2) DEFAULT 0.00,
--     additional_charges DECIMAL(10, 2) DEFAULT 0.00,
--     late_return_fee DECIMAL(10, 2) DEFAULT 0.00,
--     notes NVARCHAR(500) NULL;

-- -- Payments Table 
-- CREATE TABLE Payments (
--     payment_id INT IDENTITY(1,1) PRIMARY KEY,
--     booking_id INT NOT NULL,
--     amount DECIMAL(10, 2) NOT NULL,
--     payment_status NVARCHAR(20) DEFAULT 'Pending', 
--     payment_date DATETIME DEFAULT GETDATE(),
--     payment_method NVARCHAR(50), 
--     transaction_id NVARCHAR(100), 
--     created_at DATETIME DEFAULT GETDATE(),
--     updated_at DATETIME DEFAULT GETDATE(),

--     CONSTRAINT FK_Payments_Booking FOREIGN KEY (booking_id) REFERENCES Bookings(booking_id)
-- );
-- GO
-- -- additions
-- ALTER TABLE Payments
-- ADD 
--     gross_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00, 
--     commission_fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00, 
--     net_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00;
-- GO


-- -- Customer Support Tickets Table 
-- CREATE TABLE CustomerSupportTickets (
--     ticket_id INT IDENTITY(1,1) PRIMARY KEY,
--     user_id UNIQUEIDENTIFIER NOT NULL, 
--     subject NVARCHAR(100) NOT NULL,
--     description NVARCHAR(MAX) NOT NULL,
--     status NVARCHAR(20) DEFAULT 'Open', 
--     created_at DATETIME DEFAULT GETDATE(),
--     updated_at DATETIME DEFAULT GETDATE(),

--     CONSTRAINT FK_Tickets_User FOREIGN KEY (user_id) REFERENCES Users(user_id)
-- );
-- GO


-- --  Maintenance Records Table 
-- CREATE TABLE MaintenanceRecords (
--     maintenance_id INT IDENTITY(1,1) PRIMARY KEY,
--     vehicle_id INT NOT NULL,
--     service_type NVARCHAR(100) NOT NULL, 
--     cost DECIMAL(10, 2) NULL,
--     service_date DATETIME2 NOT NULL DEFAULT GETDATE(),
--     return_date DATETIME2 NULL, 
--     notes NVARCHAR(MAX) NULL,
--     CONSTRAINT FK_Maintenance_Vehicle FOREIGN KEY (vehicle_id) 
--     REFERENCES Vehicles(vehicle_id) ON DELETE CASCADE
-- );
-- GO

-- -- Ratings and reviews table
-- CREATE TABLE Reviews (
--     review_id INT IDENTITY(1,1) PRIMARY KEY,
--     booking_id INT NOT NULL,
--     user_id UNIQUEIDENTIFIER NOT NULL,
--     vehicle_id INT NOT NULL,
--     rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
--     comment NVARCHAR(1000) NULL,
--     created_at DATETIME2 DEFAULT GETDATE(),
    
--     CONSTRAINT FK_Reviews_Booking FOREIGN KEY (booking_id) REFERENCES Bookings(booking_id),
--     CONSTRAINT FK_Reviews_User FOREIGN KEY (user_id) REFERENCES Users(user_id),
--     CONSTRAINT FK_Reviews_Vehicle FOREIGN KEY (vehicle_id) REFERENCES Vehicles(vehicle_id)
-- );







    




-- -- Verification Statement
-- SELECT * FROM Users;
-- SELECT * FROM MaintenanceRecords;
-- SELECT * FROM  CustomerSupportTickets;
-- SELECT * FROM Payments;
-- SELECT * FROM Bookings;
-- SELECT * FROM Vehicles;
-- SELECT * FROM VehicleSpecifications;




-- -- 1. Delete the specific massive booking that is blocking you
-- DELETE FROM Bookings 
-- WHERE booking_id = 1006;

-- -- 2. (Optional) Clear ALL bookings for Vehicle 5 so you can test freely
-- DELETE FROM Bookings 
-- WHERE vehicle_id = 5;

-- -- 3. Reset the vehicle status just in case
-- UPDATE Vehicles 
-- SET booking_status = 'Available' 
-- WHERE vehicle_id = 5;



-- UPDATE Bookings 
-- SET booking_status = 'Confirmed' 
-- WHERE booking_id = 1012;











-- -- Keep KCA123A as the White Camry (Spec ID 1) - No change needed

-- -- Change KCA124A to be the Silver Camry (Spec ID 1003)
-- UPDATE Vehicles 
-- SET vehicleSpec_id = 1003 
-- WHERE license_plate = 'KCA124A';

-- -- Change KCA104A to be the Honda CR-V (Spec ID 1004)
-- UPDATE Vehicles 
-- SET vehicleSpec_id = 1004 
-- WHERE license_plate = 'KCA104A';

-- -- Change KCA194A to be the Ford F-150 (Spec ID 1005)
-- UPDATE Vehicles 
-- SET vehicleSpec_id = 1005 
-- WHERE license_plate = 'KCA194A';

-- SELECT 
--     v.vehicle_id,
--     v.rental_rate,
--     v.status,
--     v.current_mileage,
--     v.license_plate,
--     v.vin_number,
--     -- Get specific rates if they exist in specs or calculate them
--     vs.manufacturer,
--     vs.model,
--     vs.year,
--     vs.color,
--     vs.features,
--     vs.images,
--     vs.vehicle_type,
--     vs.fuel_type,
--     vs.transmission,
--     vs.seating_capacity,
--     vs.fuel_efficiency,
--     vs.on_promo,
--     vs.daily_rate,
--     vs.weekly_rate,
--     vs.monthly_rate
-- FROM Vehicles v
-- JOIN VehicleSpecifications vs ON v.vehicleSpec_id = vs.vehicleSpec_id
-- WHERE v.vehicle_id = @vehicleId; -- Ensure you filter by the specific ID



-- TRUNCATE TABLE VehicleSpecifications;


-- -- Sample Data 
--  ('Petrol', 'Diesel', 'Electric', 'Hybrid', 'CNG', 'LPG'));


-- -- Sample Data for VehicleSpecifications Table
-- INSERT INTO VehicleSpecifications (manufacturer, model, year, fuel_type, engine_capacity, transmission, seating_capacity, color, features, images)
-- VALUES 
-- ('Toyota', 'Camry SE', 2023, 'CNG', '2.5L I4', 'Automatic', 5, 'Silver', 'Bluetooth, Backup Camera, A/C', '["https://www.velocityjournal.com/images/new/2019/826/798/ty2020camry82690569.jpg", "https://www.velocityjournal.com/images/new/2019/826/798/ty2020camry82690571.jpg"]'),
-- ('Honda', 'CR-V EX', 2024, 'Hybrid', '2.0L I4', 'CVT', 5, 'Blue', 'AWD, Sunroof, Heated Seats, Lane Assist', '["https://platform.cstatic-images.com/xxlarge/in/v2/54aff0d1-471c-415a-abd6-cdf9a54cb078/26c68e4c-2ef1-4aee-84f9-19f9b21c6836/mjICDT5xuPN-_KWBZf75KzE8vNg.jpg", "https://platform.cstatic-images.com/xxlarge/in/v2/54aff0d1-471c-415a-abd6-cdf9a54cb078/26c68e4c-2ef1-4aee-84f9-19f9b21c6836/UvWTE_vJZwutapRuWjs5g-MAVd0.jpg"]'),
-- ('Ford', 'F-150 Lariat', 2022, 'Diesel', '3.5L V6 EcoBoost', 'Automatic', 5, 'Black', 'Tow Package, Leather Seats, Navigation', '["https://imgs.search.brave.com/EE1hGgSXYP5x-d4ETSxwVTGQutASJpiVxu5kfN9Y6pI/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9wbGF0/Zm9ybS5jc3RhdGlj/LWltYWdlcy5jb20v/bGFyZ2UvaW4vdjIv/ZWE0NzI0ZTAtODJj/Mi01ZDhiLWFlYTAt/YmViOWQ5ODkwMDY4/L2ViYTdjMGFhLTdh/ZjItNDQ0ZS1iYzgy/LWRjZTJlNmRmMDBl/YS9yb19hNFhhWlo4/TnRqbUFjNWJmd081/U3lIdU0uanBn"]'),
-- ('Tesla', 'Model 3', 2024, 'Electric', NULL, 'Automatic (EV)', 5, 'White', 'Autopilot, All-Glass Roof, Fast Charging', '["https://imgs.search.brave.com/vUaykAXtFKhfEcorkDSszVuZTtM79ZWwMhxYsVJJ-uc/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9zdGF0/aWMwLmNhcmJ1enpp/bWFnZXMuY29tL3dv/cmRwcmVzcy93cC1j/b250ZW50L3VwbG9h/ZHMvMjAyNC8xMS8y/MDI0LXRlc2xhLW1v/ZGVsLTMtZXh0ZXJp/b3ItMTcuanBnP3E9/NDkmZml0PWNyb3Am/dz00ODAmZHByPTI", "https://imgs.search.brave.com/re_ljBTRJ49XyBesUUhfJAeidZRssktaFTgTnudGCo4/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9pbWFn/ZXMuY2RuLmF1dG9j/YXIuY28udWsvc2l0/ZXMvYXV0b2Nhci5j/by51ay9maWxlcy90/ZXNsYS1tb2RlbC0z/LWR1YWwtbW90ZXIt/MjAyNS1qYjIuanBn", "https://imgs.search.brave.com/3ZmCKIYs4pNdsAO_Fz4t2MkL-WV1Zy2XJTvFlkYjwBk/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9pbWdk/LmFlcGxjZG4uY29t/LzM3MHgyMDgvbi9j/dy9lYy8zNzEzOC9t/b2RlbC0zLWV4dGVy/aW9yLWxlZnQtcmVh/ci10aHJlZS1xdWFy/dGVyLmpwZWc_aXNp/Zz0wJnE9ODA"]'),
-- ('Jeep', 'Wrangler Rubicon', 2021, 'Petrol', '3.6L V6', 'Manual', 4, 'Red', '4x4 Off-Road Package, Convertible Top', '["https://imgs.search.brave.com/8Poo1btovX1bOGQNHaH_cHT6cN68s4phk8KIDMJ8KI4/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9tZWRp/YS5nZXR0eWltYWdl/cy5jb20vaWQvMTI0/MzIyMzg3NC9waG90/by90aGUtamVlcC13/cmFuZ2xlci00eGUt/d2lsbHlzLXNpdHMt/b24tYS1zbG9wZS1m/b2xsb3dpbmctdGhl/LWplZXAtcHJlc3Mt/Y29uZmVyZW5jZS1h/dC10aGUtMjAyMi5q/cGc_cz02MTJ4NjEy/Jnc9MCZrPTIwJmM9/bkxjX1lVb2QtNWZu/aWF3eHEyX2NKVm1U/U1BvQkdOYnE4ZGFW/NnhTOEZDRT0"]');
-- GO

-- -- Sample Data for Vehicles Table 
-- INSERT INTO Vehicles (vehicleSpec_id, vin_number, license_plate, current_mileage, rental_rate, status)
-- VALUES 
-- (1, 'VINTOYOTA123CAMRY', 'ABC1234', 15200, 55.00, 'Available'),
-- (2, 'VINHONDA456CRVHYB', 'XYZ5678', 8900, 65.00, 'Available'),
-- (3, 'VINFORD789F150PK', 'TRK9012', 45000, 85.00, 'Available'),
-- (4, 'VINTESLA012MODL3', 'EVL3333', 21000, 75.00, 'Rented'), 
-- (5, 'VINJEEP345WRANGLR', 'JEP4444', 32000, 60.00, 'Maintenance'); 
-- GO


-- -- Sample Data for Bookings Table 

-- INSERT INTO Bookings (user_id, vehicle_id, booking_date, return_date, total_amount, booking_status, created_at)
-- VALUES
-- (
--     '6A2B4C8D-E1F0-45A6-9C3E-1D7F5B8A4C2E', 
--     4,                                      
--     '2025-11-25 10:00:00',
--     '2025-11-28 10:00:00',
--     225.00,                                 
--     'Confirmed',
--     GETDATE()
-- ),
-- (
--     '6A2B4C8D-E1F0-45A6-9C3E-1D7F5B8A4C2E', 
--     1,                                      
--     '2025-12-01 09:00:00',
--     '2025-12-05 09:00:00',
--     220.00,                                 
--     'Pending',
--     GETDATE()
-- );
-- GO

-- -- Sample Data for Payments Table 

-- INSERT INTO Payments (booking_id, amount, payment_status, payment_method, transaction_id)
-- VALUES 
-- (1, 225.00, 'Completed', 'Credit Card', 'TXN1234567890ABC');
-- GO

-- --  Sample Data for CustomerSupportTickets Table 

-- INSERT INTO CustomerSupportTickets (user_id, subject, description, status)
-- VALUES 
-- ('6A2B4C8D-E1F0-45A6-9C3E-1D7F5B8A4C2E', 'Issue with Tesla Booking #1', 'The mobile app crashed when I tried to add insurance to my booking.', 'Open');
-- GO

-- --  Sample Data for Maintenance Records Table 

-- INSERT INTO MaintenanceRecords (vehicle_id, service_type, cost, notes)
-- VALUES 
-- (5, 'Routine Service + Tire Rotation', 150.75, 'Vehicle 5 in the shop for standard 30k mile service and a wash.');
-- GO


-- -- Check current database time and timezone
-- SELECT 
--     GETDATE() as current_db_time,
--     SYSDATETIMEOFFSET() as current_db_time_with_offset,
--     @@SERVERNAME as server_name;

-- --TRUNCATE TABLE Users;

-- --DELETE FROM Users;

-- UPDATE Users
-- SET role = 'superAdmin'
-- WHERE email = 'amritkhatri254@gmail.com';


-- UPDATE Users
-- SET status = 'banned'
-- WHERE email = 'delete@gmail.com';

-- UPDATE Users
-- SET role = 'admin'
-- WHERE email = '22514@student.embuni.ac.ke';