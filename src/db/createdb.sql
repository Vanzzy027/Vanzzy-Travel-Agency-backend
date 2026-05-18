-- Users Table
CREATE TABLE Users (
    user_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    first_name NVARCHAR(50) NOT NULL,
    last_name NVARCHAR(50) NOT NULL,
    email NVARCHAR(100) NOT NULL UNIQUE,
    password NVARCHAR(255) NOT NULL,
    contact_phone NVARCHAR(20) NOT NULL,
    address NVARCHAR(255) NULL,
    photo NVARCHAR(255) NULL,
    role NVARCHAR(20) DEFAULT 'user' NOT NULL,
    status NVARCHAR(20) DEFAULT 'active' NOT NULL,
    verified BIT DEFAULT 0 NOT NULL,
    otp_code NVARCHAR(10) NULL,
    otp_expires_at DATETIME2 NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NULL,
    national_id VARCHAR(20) NOT NULL UNIQUE,
    
    CONSTRAINT CK_Users_Status CHECK (status IN ('active', 'inactive', 'banned')),
    CONSTRAINT CK_Users_Role CHECK (role IN ('superAdmin', 'admin', 'user'))
);
GO

-- Vehicle Specifications Table
CREATE TABLE VehicleSpecifications (
    vehicleSpec_id INT IDENTITY(1,1) PRIMARY KEY,
    manufacturer NVARCHAR(50) NOT NULL,
    model NVARCHAR(50) NOT NULL,
    year INT NOT NULL,
    fuel_type NVARCHAR(20) NOT NULL,
    engine_capacity NVARCHAR(20),
    transmission NVARCHAR(20) NOT NULL,
    seating_capacity INT NOT NULL,
    color NVARCHAR(30),
    features NVARCHAR(MAX),
    images NVARCHAR(MAX) NULL,
    on_promo BIT DEFAULT 0 NOT NULL,
    review_count INT DEFAULT 0,
    vehicle_type NVARCHAR(30) NOT NULL DEFAULT 'Sedan',
    fuel_efficiency NVARCHAR(20) NULL,
    daily_rate DECIMAL(10,2) NULL,
    weekly_rate DECIMAL(10,2) NULL,
    monthly_rate DECIMAL(10,2) NULL,
    insurance_group NVARCHAR(20) NULL,
    updated_at DATETIME DEFAULT GETDATE(),
    promo_rate DECIMAL(10, 2) NULL,
    promo_start_date DATETIME2 NULL,
    promo_end_date DATETIME2 NULL,
    
    CONSTRAINT CK_Vehicle_Type CHECK (vehicle_type IN ('Sedan', 'SUV', 'Truck', 'Van', 'Hatchback', 'Coupe', 'Convertible', 'Minivan', 'Sports Car')),
    CONSTRAINT CK_Fuel_Type CHECK (fuel_type IN ('Petrol', 'Diesel', 'Electric', 'Hybrid', 'CNG', 'LPG'))
);
GO

-- Vehicles Table
CREATE TABLE Vehicles (
    vehicle_id INT IDENTITY(1,1) PRIMARY KEY,
    vehicleSpec_id INT NOT NULL,
    vin_number NVARCHAR(50) NOT NULL UNIQUE,
    license_plate NVARCHAR(20) NOT NULL UNIQUE,
    current_mileage INT NOT NULL,
    rental_rate DECIMAL(10, 2) NOT NULL,
    status NVARCHAR(20) DEFAULT 'Available' NOT NULL
        CONSTRAINT CK_Vehicle_Status CHECK (status IN ('Available', 'Rented', 'Maintenance', 'Unavailable', 'Banned')),
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    
    CONSTRAINT FK_Vehicles_Specs FOREIGN KEY (vehicleSpec_id) 
    REFERENCES VehicleSpecifications(vehicleSpec_id) ON DELETE CASCADE
);
GO

-- Bookings Table
CREATE TABLE Bookings (
    booking_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id UNIQUEIDENTIFIER NOT NULL,
    vehicle_id INT NOT NULL,
    booking_date DATETIME NOT NULL,
    return_date DATETIME NOT NULL,
    actual_return_date DATETIME NULL,
    start_mileage INT NULL,
    end_mileage INT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    booking_status NVARCHAR(20) DEFAULT 'Pending',
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    insurance_fee DECIMAL(10, 2) DEFAULT 0.00,
    additional_charges DECIMAL(10, 2) DEFAULT 0.00,
    late_return_fee DECIMAL(10, 2) DEFAULT 0.00,
    notes NVARCHAR(500) NULL,
    
    CONSTRAINT FK_Bookings_User FOREIGN KEY (user_id) REFERENCES Users(user_id),
    CONSTRAINT FK_Bookings_Vehicle FOREIGN KEY (vehicle_id) REFERENCES Vehicles(vehicle_id),
    CONSTRAINT CK_Booking_Status CHECK (booking_status IN ('Pending', 'Confirmed', 'Active', 'Completed', 'Cancelled', 'Late'))
);
GO

-- Payments Table
CREATE TABLE Payments (
    payment_id INT IDENTITY(1,1) PRIMARY KEY,
    booking_id INT NOT NULL,
    user_id UNIQUEIDENTIFIER NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    gross_amount DECIMAL(10, 2) NOT NULL,
    commission_fee DECIMAL(10, 2) NOT NULL,
    net_amount DECIMAL(10, 2) NOT NULL,
    payment_status NVARCHAR(20) NOT NULL DEFAULT 'Pending',
    payment_method NVARCHAR(20) NOT NULL,
    transaction_id NVARCHAR(100) NULL,
    transaction_reference NVARCHAR(100) NULL,
    phone NVARCHAR(20) NULL,
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME NOT NULL DEFAULT GETDATE(),
    payment_date DATETIME NOT NULL DEFAULT GETDATE(),
    
    CONSTRAINT FK_Payments_Booking FOREIGN KEY (booking_id)
        REFERENCES Bookings(booking_id) ON DELETE CASCADE,
    
    CONSTRAINT FK_Payments_User FOREIGN KEY (user_id)
        REFERENCES Users(user_id) ON DELETE CASCADE,
    
    CONSTRAINT CK_Payment_Status CHECK (
        payment_status IN ('Pending', 'Completed', 'Failed', 'Refunded')
    ),
    
    CONSTRAINT CK_Payment_Method CHECK (
        payment_method IN ('M-Pesa', 'Card')
    )
);
GO

-- Customer Support Tickets Table
CREATE TABLE CustomerSupportTickets (
    ticket_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id UNIQUEIDENTIFIER NOT NULL,
    subject NVARCHAR(150) NOT NULL,
    category NVARCHAR(50) NOT NULL,
    priority NVARCHAR(20) DEFAULT 'Low',
    description NVARCHAR(MAX) NOT NULL,
    status NVARCHAR(20) DEFAULT 'Open',
    admin_response NVARCHAR(MAX) NULL,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    
    CONSTRAINT FK_Tickets_User FOREIGN KEY (user_id) REFERENCES Users(user_id)
);
GO

-- Maintenance Records Table
CREATE TABLE MaintenanceRecords (
    maintenance_id INT IDENTITY(1,1) PRIMARY KEY,
    vehicle_id INT NOT NULL,
    service_type NVARCHAR(100) NOT NULL,
    cost DECIMAL(10, 2) NULL,
    service_date DATETIME2 NOT NULL DEFAULT GETDATE(),
    return_date DATETIME2 NULL,
    notes NVARCHAR(MAX) NULL,
    
    CONSTRAINT FK_Maintenance_Vehicle FOREIGN KEY (vehicle_id) 
    REFERENCES Vehicles(vehicle_id) ON DELETE CASCADE
);
GO

-- Ratings and Reviews Table
CREATE TABLE Reviews (
    review_id INT IDENTITY(1,1) PRIMARY KEY,
    booking_id INT NOT NULL,
    user_id UNIQUEIDENTIFIER NOT NULL,
    vehicle_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment NVARCHAR(1000) NULL,
    status NVARCHAR(20) DEFAULT 'Pending',
    is_featured BIT DEFAULT 0,
    admin_comment NVARCHAR(500) NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    
    CONSTRAINT FK_Reviews_Booking FOREIGN KEY (booking_id) REFERENCES Bookings(booking_id),
    CONSTRAINT FK_Reviews_User FOREIGN KEY (user_id) REFERENCES Users(user_id),
    CONSTRAINT FK_Reviews_Vehicle FOREIGN KEY (vehicle_id) REFERENCES Vehicles(vehicle_id),
    CONSTRAINT UQ_Booking_Review UNIQUE (booking_id)
);
GO
















-- Insert Sample Data into Users Table
-- ==========================================
-- 1. USERS TABLE (15 Users)
-- ==========================================
INSERT INTO Users (user_id, first_name, last_name, email, password, contact_phone, address, photo, role, status, verified, national_id)
VALUES 
-- Requested Specific Users
('11111111-1111-1111-1111-111111111111', 'Vanzzy', 'Spinet', 'vanzzyspinet@gmail.com', 'hashed_pw_xyz123', '+254711000001', 'Nairobi, Kenya', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80', 'user', 'active', 1, 'ID9000001'),
('22222222-2222-2222-2222-222222222222', 'Amrit', 'Khatri', 'amritkhatri027@gmail.com', 'hashed_pw_xyz123', '+254711000002', 'Mombasa, Kenya', 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=400&q=80', 'user', 'active', 1, 'ID9000002'),
('33333333-3333-3333-3333-333333333333', 'System', 'Admin', '22514@student.embuni.ac.ke', 'hashed_pw_admin99', '+254711000003', 'Embu, Kenya', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80', 'admin', 'active', 1, 'ID9000003'),

-- Additional Realistic Users
('44444444-4444-4444-4444-444444444444', 'Liam', 'Ochieng', 'liam.ochieng@outlook.com', 'pwd_hash_4', '+254722000004', 'Kisumu, Kenya', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80', 'user', 'active', 1, 'ID9000004'),
('55555555-5555-5555-5555-555555555555', 'Sarah', 'Mwangi', 'sarahmwangi88@gmail.com', 'pwd_hash_5', '+254733000005', 'Nakuru, Kenya', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80', 'user', 'active', 1, 'ID9000005'),
('66666666-6666-6666-6666-666666666666', 'David', 'Kamau', 'dkamau.invest@yahoo.com', 'pwd_hash_6', '+254744000006', 'Eldoret, Kenya', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80', 'user', 'inactive', 0, 'ID9000006'),
('77777777-7777-7777-7777-777777777777', 'Chloe', 'Nekesa', 'chloe.nekesa@gmail.com', 'pwd_hash_7', '+254755000007', 'Nairobi, Kenya', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80', 'user', 'active', 1, 'ID9000007'),
('88888888-8888-8888-8888-888888888888', 'Marcus', 'Mutua', 'marcus.m@icloud.com', 'pwd_hash_8', '+254766000008', 'Machakos, Kenya', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80', 'user', 'banned', 0, 'ID9000008'),
('99999999-9999-9999-9999-999999999999', 'Emma', 'Wanjiku', 'ewanjiku.design@gmail.com', 'pwd_hash_9', '+254777000009', 'Thika, Kenya', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80', 'user', 'active', 1, 'ID9000009'),
('AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA', 'Felix', 'Kiprono', 'felix.kip@gmail.com', 'pwd_hash_10', '+254788000010', 'Kericho, Kenya', 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=400&q=80', 'user', 'active', 1, 'ID9000010'),
('BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBBB', 'Grace', 'Achieng', 'gachieng1995@outlook.com', 'pwd_hash_11', '+254799000011', 'Nairobi, Kenya', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80', 'user', 'active', 1, 'ID9000011'),
('CCCCCCCC-CCCC-CCCC-CCCC-CCCCCCCCCCCC', 'Brian', 'Otieno', 'brian.ot@yahoo.com', 'pwd_hash_12', '+254700000012', 'Kisumu, Kenya', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80', 'user', 'active', 1, 'ID9000012'),
('DDDDDDDD-DDDD-DDDD-DDDD-DDDDDDDDDDDD', 'Mercy', 'Wambui', 'mercy.wambs@gmail.com', 'pwd_hash_13', '+254711111013', 'Naivasha, Kenya', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=400&q=80', 'user', 'active', 1, 'ID9000013'),
('EEEEEEEE-EEEE-EEEE-EEEE-EEEEEEEEEEEE', 'Victor', 'Koech', 'vkoech.tech@gmail.com', 'pwd_hash_14', '+254722222014', 'Nairobi, Kenya', 'https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?auto=format&fit=crop&w=400&q=80', 'user', 'active', 1, 'ID9000014'),
('FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF', 'Super', 'Admin', 'superadmin@fleetcorp.com', 'pwd_hash_15', '+254733333015', 'Global Office', 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80', 'superAdmin', 'active', 1, 'ID9000015');
GO

-- ==========================================
-- 2. VEHICLE SPECIFICATIONS TABLE (22 Vehicles)
-- ==========================================
INSERT INTO VehicleSpecifications (
    manufacturer, model, year, fuel_type, engine_capacity, transmission, seating_capacity, color, 
    features, images, on_promo, review_count, vehicle_type, fuel_efficiency, 
    daily_rate, weekly_rate, monthly_rate, insurance_group
)
VALUES 
-- 1. Rolls Royce Phantom
('Rolls-Royce', 'Phantom', 2023, 'Petrol', '6.75L V12', 'Automatic', 4, 'Midnight Black', 
'Starlight Headliner, Massage Seats, V12 Engine, Chauffeur Package', 'https://images.unsplash.com/photo-1631815159045-8c015b6b149b?auto=format&fit=crop&w=800&q=80', 0, 12, 'Sedan', '12 MPG', 1200.00, 7500.00, 28000.00, 'Group 50'),

-- 2. Land Rover Range Rover Autobiography
('Land Rover', 'Range Rover', 2024, 'Petrol', '4.4L V8', 'Automatic', 5, 'Santorini Black', 
'Air Suspension, Meridian Audio, Panoramic Roof, Off-road Tech', 'https://images.unsplash.com/photo-1606016159991-cdf4a2307fb5?auto=format&fit=crop&w=800&q=80', 1, 45, 'SUV', '18 MPG', 450.00, 2800.00, 10500.00, 'Group 48'),

-- 3. Mercedes-Benz G-Class (G63 AMG)
('Mercedes-Benz', 'G63 AMG', 2023, 'Petrol', '4.0L V8', 'Automatic', 5, 'Matte Olive', 
'AMG Performance, Burmester Audio, Differential Locks', 'https://images.unsplash.com/photo-1520031441872-265e4ff70366?auto=format&fit=crop&w=800&q=80', 0, 30, 'SUV', '14 MPG', 500.00, 3200.00, 12000.00, 'Group 50'),

-- 4. BMW M5 Competition
('BMW', 'M5', 2022, 'Petrol', '4.4L V8', 'Automatic', 5, 'Marina Bay Blue', 
'M xDrive, Carbon Roof, Bower & Wilkins, Driver Assist', 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=80', 1, 25, 'Sedan', '17 MPG', 350.00, 2200.00, 8000.00, 'Group 45'),

-- 5. Porsche 911 Carrera S
('Porsche', '911 Carrera S', 2023, 'Petrol', '3.0L Flat-6', 'Automatic', 2, 'Guards Red', 
'Sport Chrono, PASM, Bose Audio, Matrix LED', 'https://images.unsplash.com/photo-1503376710349-5f210d5402cd?auto=format&fit=crop&w=800&q=80', 0, 18, 'Coupe', '20 MPG', 400.00, 2500.00, 9500.00, 'Group 47'),

-- 6. Mercedes-Benz S-Class
('Mercedes-Benz', 'S580', 2024, 'Hybrid', '4.0L V8', 'Automatic', 5, 'Obsidian Black', 
'Executive Rear Seats, MBUX, Augmented Reality HUD', 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=800&q=80', 0, 40, 'Sedan', '22 MPG', 420.00, 2700.00, 10000.00, 'Group 46'),

-- 7. Tesla Model S Plaid
('Tesla', 'Model S Plaid', 2023, 'Electric', 'Tri-Motor', 'Automatic', 5, 'Pearl White', 
'Autopilot, Yoke Steering, 1020 HP, 396 Mile Range', 'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=800&q=80', 1, 55, 'Sedan', '116 MPGe', 300.00, 1900.00, 7000.00, 'Group 44'),

-- 8. Audi RS7 Sportback
('Audi', 'RS7', 2022, 'Petrol', '4.0L V8', 'Automatic', 4, 'Nardo Grey', 
'Quattro AWD, RS Sport Suspension, Bang & Olufsen', 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80', 0, 22, 'Coupe', '16 MPG', 380.00, 2400.00, 9000.00, 'Group 45'),

-- 9. Lamborghini Huracán EVO
('Lamborghini', 'Huracán EVO', 2021, 'Petrol', '5.2L V10', 'Automatic', 2, 'Verde Mantis', 
'AWD, Carbon Ceramic Brakes, Lifting System', 'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?auto=format&fit=crop&w=800&q=80', 0, 15, 'Sports Car', '15 MPG', 1100.00, 7000.00, 26000.00, 'Group 50'),

-- 10. Bentley Continental GT
('Bentley', 'Continental GT', 2023, 'Petrol', '6.0L W12', 'Automatic', 4, 'Glacier White', 
'Rotating Display, Naim Audio, Touring Spec', 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=800&q=80', 0, 10, 'Coupe', '14 MPG', 950.00, 6000.00, 22000.00, 'Group 50'),

-- 11. Maserati Levante Trofeo
('Maserati', 'Levante', 2022, 'Petrol', '3.8L V8', 'Automatic', 5, 'Blu Emozione', 
'Ferrari-built V8, Carbon Fiber Trim, Skyhook Suspension', 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?auto=format&fit=crop&w=800&q=80', 1, 8, 'SUV', '16 MPG', 350.00, 2200.00, 8500.00, 'Group 45'),

-- 12. Chevrolet Corvette C8
('Chevrolet', 'Corvette Stingray', 2023, 'Petrol', '6.2L V8', 'Automatic', 2, 'Torch Red', 
'Mid-Engine, Z51 Package, Magnetic Ride Control', 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80', 0, 42, 'Sports Car', '19 MPG', 250.00, 1500.00, 5500.00, 'Group 40'),

-- 13. Aston Martin DB11
('Aston Martin', 'DB11', 2021, 'Petrol', '4.0L V8', 'Automatic', 4, 'Magnetic Silver', 
'Leather Interior, 360 Camera, Sport Plus', 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80', 0, 5, 'Coupe', '18 MPG', 800.00, 5000.00, 18000.00, 'Group 50'),

-- 14. McLaren 720S
('McLaren', '720S', 2022, 'Petrol', '4.0L V8', 'Automatic', 2, 'Papaya Spark', 
'Carbon Fiber Monocage, Dihedral Doors', 'https://images.unsplash.com/photo-1610880846497-7257b2476d05?auto=format&fit=crop&w=800&q=80', 0, 7, 'Sports Car', '18 MPG', 1200.00, 7500.00, 28000.00, 'Group 50'),

-- 15. Jaguar F-Type R
('Jaguar', 'F-Type R', 2023, 'Petrol', '5.0L V8', 'Automatic', 2, 'Firesand Metallic', 
'Supercharged, AWD, Switchable Active Exhaust', 'https://images.unsplash.com/photo-1502877338535-494e51efa313?auto=format&fit=crop&w=800&q=80', 1, 14, 'Coupe', '18 MPG', 280.00, 1800.00, 6500.00, 'Group 42'),

-- 16. Jeep Wrangler Rubicon
('Jeep', 'Wrangler Rubicon', 2023, 'Petrol', '3.6L V6', 'Automatic', 5, 'Sarge Green', 
'4x4, Removable Top, Fox Shocks, Winch', 'https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=800&q=80', 0, 65, 'SUV', '20 MPG', 180.00, 1100.00, 4000.00, 'Group 35'),

-- 17. Ford Mustang Mach-E
('Ford', 'Mustang Mach-E', 2024, 'Electric', 'Dual Motor', 'Automatic', 5, 'Rapid Red', 
'AWD, BlueCruise, Bang & Olufsen, 300mi Range', 'https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?auto=format&fit=crop&w=800&q=80', 1, 38, 'SUV', '100 MPGe', 150.00, 900.00, 3200.00, 'Group 30'),

-- 18. Toyota Land Cruiser LC300
('Toyota', 'Land Cruiser', 2023, 'Diesel', '3.3L V6', 'Automatic', 7, 'Pearl White', 
'Twin-Turbo, KDSS, Cool Box, 4WD', 'https://images.unsplash.com/photo-1603415526960-f7e0328c63b1?auto=format&fit=crop&w=800&q=80', 0, 80, 'SUV', '22 MPG', 250.00, 1600.00, 6000.00, 'Group 38'),

-- 19. Lexus LX 600
('Lexus', 'LX 600', 2024, 'Petrol', '3.5L V6', 'Automatic', 7, 'Caviar', 
'Mark Levinson Audio, Rear Seat Entertainment', 'https://images.unsplash.com/photo-1629897048514-3dd741530283?auto=format&fit=crop&w=800&q=80', 0, 20, 'SUV', '19 MPG', 320.00, 2000.00, 7500.00, 'Group 42'),

-- 20. Bugatti Chiron (Exclusive Flagship)
('Bugatti', 'Chiron', 2021, 'Petrol', '8.0L W16', 'Automatic', 2, 'French Racing Blue', 
'Quad-Turbo, 1500 HP, Carbon Fiber Body', 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=800&q=80', 0, 2, 'Sports Car', '11 MPG', 15000.00, 95000.00, 350000.00, 'Group 50'),

-- 21. Volvo XC90 Recharge
('Volvo', 'XC90', 2023, 'Hybrid', '2.0L I4', 'Automatic', 7, 'Crystal White', 
'PHEV, Pilot Assist, Bowers & Wilkins', 'https://images.unsplash.com/photo-1501066927591-314112b5888e?auto=format&fit=crop&w=800&q=80', 1, 45, 'SUV', '58 MPGe', 180.00, 1100.00, 4200.00, 'Group 35'),

-- 22. Alfa Romeo Giulia Quadrifoglio
('Alfa Romeo', 'Giulia', 2022, 'Petrol', '2.9L V6', 'Automatic', 5, 'Rosso Competizione', 
'Ferrari-Derived Engine, Carbon Fiber Hood', 'https://images.unsplash.com/photo-1581457635293-6c84c7e6c466?auto=format&fit=crop&w=800&q=80', 0, 12, 'Sedan', '20 MPG', 220.00, 1400.00, 5000.00, 'Group 40');
GO

-- ==========================================
-- 3. VEHICLES TABLE (Mapping directly to Specifications 1-22)
-- ==========================================
INSERT INTO Vehicles (vehicleSpec_id, vin_number, license_plate, current_mileage, rental_rate, status)
VALUES 
(1, 'VINRR00000000001', 'KDE 001A', 5000, 1200.00, 'Available'),
(2, 'VINLR00000000002', 'KDE 002B', 12500, 450.00, 'Rented'),
(3, 'VINMB00000000003', 'KDE 003C', 8200, 500.00, 'Available'),
(4, 'VINBM00000000004', 'KDE 004D', 15000, 350.00, 'Maintenance'),
(5, 'VINPO00000000005', 'KDE 005E', 3000, 400.00, 'Available'),
(6, 'VINMB00000000006', 'KDE 006F', 4000, 420.00, 'Rented'),
(7, 'VINTS00000000007', 'KDE 007G', 2100, 300.00, 'Available'),
(8, 'VINAU00000000008', 'KDE 008H', 18000, 380.00, 'Available'),
(9, 'VINLA00000000009', 'KDE 009I', 1200, 1100.00, 'Rented'),
(10, 'VINBE00000000010', 'KDE 010J', 4500, 950.00, 'Available'),
(11, 'VINMA00000000011', 'KDE 011K', 22000, 350.00, 'Unavailable'),
(12, 'VINCH00000000012', 'KDE 012L', 7000, 250.00, 'Available'),
(13, 'VINAM00000000013', 'KDE 013M', 800, 800.00, 'Maintenance'),
(14, 'VINMC00000000014', 'KDE 014N', 1500, 1200.00, 'Available'),
(15, 'VINJA00000000015', 'KDE 015O', 11000, 280.00, 'Available'),
(16, 'VINJE00000000016', 'KDE 016P', 35000, 180.00, 'Rented'),
(17, 'VINFO00000000017', 'KDE 017Q', 5000, 150.00, 'Available'),
(18, 'VINTO00000000018', 'KDE 018R', 42000, 250.00, 'Available'),
(19, 'VINLE00000000019', 'KDE 019S', 9000, 320.00, 'Banned'),
(20, 'VINBU00000000020', 'KDE 020T', 100, 15000.00, 'Available'),
(21, 'VINVO00000000021', 'KDE 021U', 16000, 180.00, 'Available'),
(22, 'VINAL00000000022', 'KDE 022V', 14500, 220.00, 'Rented');
GO

-- ==========================================
-- 4. BOOKINGS TABLE (12 Sensible Bookings)
-- ==========================================
INSERT INTO Bookings (user_id, vehicle_id, booking_date, return_date, actual_return_date, start_mileage, end_mileage, total_amount, booking_status, insurance_fee, additional_charges, late_return_fee)
VALUES
-- 1. Completed Booking (Vanzzy - BMW M5)
('11111111-1111-1111-1111-111111111111', 4, DATEADD(day, -20, GETDATE()), DATEADD(day, -15, GETDATE()), DATEADD(day, -15, GETDATE()), 14000, 14500, 1750.00, 'Completed', 100.00, 0, 0),

-- 2. Active Booking (Amrit - Range Rover)
('22222222-2222-2222-2222-222222222222', 2, DATEADD(day, -2, GETDATE()), DATEADD(day, 3, GETDATE()), NULL, 12500, NULL, 2250.00, 'Active', 150.00, 0, 0),

-- 3. Pending Booking (Liam - Rolls Royce)
('44444444-4444-4444-4444-444444444444', 1, DATEADD(day, 5, GETDATE()), DATEADD(day, 7, GETDATE()), NULL, NULL, NULL, 2400.00, 'Pending', 200.00, 0, 0),

-- 4. Active Booking (Sarah - Mercedes S-Class)
('55555555-5555-5555-5555-555555555555', 6, DATEADD(day, -1, GETDATE()), DATEADD(day, 4, GETDATE()), NULL, 4000, NULL, 2100.00, 'Active', 120.00, 0, 0),

-- 5. Late Booking (David - Jeep Wrangler)
('66666666-6666-6666-6666-666666666666', 16, DATEADD(day, -10, GETDATE()), DATEADD(day, -2, GETDATE()), NULL, 34000, NULL, 1440.00, 'Late', 80.00, 0, 200.00),

-- 6. Cancelled Booking (Chloe - Tesla Model S)
('77777777-7777-7777-7777-777777777777', 7, DATEADD(day, -5, GETDATE()), DATEADD(day, -3, GETDATE()), NULL, NULL, NULL, 600.00, 'Cancelled', 0, 0, 0),

-- 7. Completed Booking (Emma - Porsche 911)
('99999999-9999-9999-9999-999999999999', 5, DATEADD(day, -30, GETDATE()), DATEADD(day, -27, GETDATE()), DATEADD(day, -27, GETDATE()), 2500, 2800, 1200.00, 'Completed', 150.00, 50.00, 0),

-- 8. Active Booking (Felix - Lamborghini)
('AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA', 9, DATEADD(day, 0, GETDATE()), DATEADD(day, 2, GETDATE()), NULL, 1100, NULL, 2200.00, 'Active', 500.00, 0, 0),

-- 9. Confirmed Booking (Grace - Land Cruiser)
('BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBBB', 18, DATEADD(day, 10, GETDATE()), DATEADD(day, 15, GETDATE()), NULL, NULL, NULL, 1250.00, 'Confirmed', 100.00, 0, 0),

-- 10. Completed Booking (Brian - Corvette)
('CCCCCCCC-CCCC-CCCC-CCCC-CCCCCCCCCCCC', 12, DATEADD(day, -45, GETDATE()), DATEADD(day, -40, GETDATE()), DATEADD(day, -39, GETDATE()), 6000, 6800, 1250.00, 'Completed', 90.00, 0, 100.00),

-- 11. Active Booking (Mercy - Alfa Romeo)
('DDDDDDDD-DDDD-DDDD-DDDD-DDDDDDDDDDDD', 22, DATEADD(day, -1, GETDATE()), DATEADD(day, 2, GETDATE()), NULL, 14300, NULL, 660.00, 'Active', 70.00, 0, 0),

-- 12. Pending Booking (Victor - Bugatti Chiron)
('EEEEEEEE-EEEE-EEEE-EEEE-EEEEEEEEEEEE', 20, DATEADD(day, 20, GETDATE()), DATEADD(day, 21, GETDATE()), NULL, NULL, NULL, 15000.00, 'Pending', 2000.00, 0, 0);
GO

-- ==========================================
-- 5. PAYMENTS TABLE (Linked to Bookings 1-12)
-- ==========================================
INSERT INTO Payments (booking_id, user_id, amount, gross_amount, commission_fee, net_amount, payment_status, payment_method, transaction_id)
VALUES
(1, '11111111-1111-1111-1111-111111111111', 1750.00, 1850.00, 185.00, 1665.00, 'Completed', 'Card', 'TXN-CARD-9001'),
(2, '22222222-2222-2222-2222-222222222222', 2250.00, 2400.00, 240.00, 2160.00, 'Completed', 'M-Pesa', 'TXN-MPESA-9002'),
(3, '44444444-4444-4444-4444-444444444444', 2400.00, 2600.00, 260.00, 2340.00, 'Pending', 'Card', NULL),
(4, '55555555-5555-5555-5555-555555555555', 2100.00, 2220.00, 222.00, 1998.00, 'Completed', 'M-Pesa', 'TXN-MPESA-9004'),
(5, '66666666-6666-6666-6666-666666666666', 1440.00, 1520.00, 152.00, 1368.00, 'Completed', 'Card', 'TXN-CARD-9005'),
(6, '77777777-7777-7777-7777-777777777777', 600.00, 600.00, 60.00, 540.00, 'Refunded', 'M-Pesa', 'TXN-MPESA-9006'),
(7, '99999999-9999-9999-9999-999999999999', 1200.00, 1400.00, 140.00, 1260.00, 'Completed', 'Card', 'TXN-CARD-9007'),
(8, 'AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA', 2200.00, 2700.00, 270.00, 2430.00, 'Completed', 'M-Pesa', 'TXN-MPESA-9008'),
(9, 'BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBBB', 1250.00, 1350.00, 135.00, 1215.00, 'Completed', 'Card', 'TXN-CARD-9009'),
(10, 'CCCCCCCC-CCCC-CCCC-CCCC-CCCCCCCCCCCC', 1250.00, 1440.00, 144.00, 1296.00, 'Completed', 'M-Pesa', 'TXN-MPESA-9010'),
(11, 'DDDDDDDD-DDDD-DDDD-DDDD-DDDDDDDDDDDD', 660.00, 730.00, 73.00, 657.00, 'Completed', 'Card', 'TXN-CARD-9011'),
(12, 'EEEEEEEE-EEEE-EEEE-EEEE-EEEEEEEEEEEE', 15000.00, 17000.00, 1700.00, 15300.00, 'Pending', 'M-Pesa', NULL);
GO

-- ==========================================
-- 6. REVIEWS TABLE (For Completed Bookings)
-- ==========================================
INSERT INTO Reviews (booking_id, user_id, vehicle_id, rating, comment, status, is_featured, admin_comment)
VALUES
(1, '11111111-1111-1111-1111-111111111111', 4, 5, 'The BMW M5 was an absolute dream to drive. Immaculate condition inside and out.', 'Approved', 1, 'Thank you Vanzzy! We are glad you enjoyed the M5.'),
(7, '99999999-9999-9999-9999-999999999999', 5, 5, 'Porsche 911 handled the winding roads perfectly. Very professional handover process.', 'Approved', 1, NULL),
(10, 'CCCCCCCC-CCCC-CCCC-CCCC-CCCCCCCCCCCC', 12, 4, 'Great car, but I returned it an hour late and was charged heavily. Still a good experience overall.', 'Approved', 0, 'Hi Brian, we adhere strictly to our late return policy to ensure cars are ready for the next client. Hope to see you again!');
GO

-- ==========================================
-- 7. CUSTOMER SUPPORT TICKETS
-- ==========================================
INSERT INTO CustomerSupportTickets (user_id, subject, category, priority, description, status, admin_response)
VALUES
('66666666-6666-6666-6666-666666666666', 'Dispute over late return fee', 'Billing', 'High', 'I got stuck in severe traffic in Nairobi and returned the Jeep 2 hours late. I feel the $200 late fee is unjustified.', 'Open', NULL),
('77777777-7777-7777-7777-777777777777', 'Refund timeline inquiry', 'Refunds', 'Medium', 'My booking was cancelled 3 days ago. When will the funds reflect in my M-Pesa?', 'Closed', 'Hi Chloe, M-Pesa refunds take 3-5 business days. You should receive it by tomorrow.'),
('22222222-2222-2222-2222-222222222222', 'Feature Request: Add more EVs', 'Feedback', 'Low', 'Loved the Range Rover, but would love to see more electric vehicles like the Porsche Taycan in your fleet.', 'Open', NULL);
GO

-- ==========================================
-- 8. MAINTENANCE RECORDS
-- ==========================================
INSERT INTO MaintenanceRecords (vehicle_id, service_type, cost, service_date, return_date, notes)
VALUES
(4, 'Routine Engine Check & Oil Change', 450.00, DATEADD(day, -1, GETDATE()), DATEADD(day, 2, GETDATE()), 'Scheduled BMW maintenance at 15,000 miles.'),
(13, 'Brake Pad Replacement', 850.00, DATEADD(day, -2, GETDATE()), DATEADD(day, 5, GETDATE()), 'Aston Martin required new carbon ceramic brake pads.'),
(1, 'Full Detail & Sanitization', 120.00, DATEADD(day, -30, GETDATE()), DATEADD(day, -29, GETDATE()), 'Routine deep clean for the Rolls Royce before VIP booking.');
GO


Update Users
SETT ROLE = 'admin'
WHERE email = 'marsolomon100@gmail.com';



