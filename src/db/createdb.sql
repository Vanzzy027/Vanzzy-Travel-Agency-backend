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
















