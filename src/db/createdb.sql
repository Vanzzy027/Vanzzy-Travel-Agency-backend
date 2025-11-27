-- Users Table
CREATE TABLE Users (
    user_id INT IDENTITY(1,1) PRIMARY KEY,
    first_name NVARCHAR(50) NOT NULL,
    last_name NVARCHAR(50) NOT NULL,
    email NVARCHAR(100) NOT NULL UNIQUE,
    password NVARCHAR(255) NOT NULL, 
    contact_phone NVARCHAR(20) NOT NULL,
    address NVARCHAR(255),
    role NVARCHAR(20) DEFAULT 'user', 
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    otp NVARCHAR(10) NULL, 
    otp_expiry DATETIME NULL, 
    CONSTRAINT CK_Users_Role CHECK (role IN ('superAdmin','admin', 'user'))
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
);
GO

-- Vehicles Table 
CREATE TABLE Vehicles (
    vehicle_id INT IDENTITY(1,1) PRIMARY KEY,
    vehicleSpec_id INT NOT NULL,
    rental_rate DECIMAL(10, 2) NOT NULL, 
    availability BIT DEFAULT 1, 
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Vehicles_Specs FOREIGN KEY (vehicleSpec_id) 
    REFERENCES VehicleSpecifications(vehicleSpec_id) ON DELETE CASCADE -- on delete we will delete all associated records in a child once the parent is deleted
);
GO

-- Bookings Table
CREATE TABLE Bookings (
    booking_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    vehicle_id INT NOT NULL,
    booking_date DATETIME NOT NULL,
    return_date DATETIME NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    booking_status NVARCHAR(20) DEFAULT 'Pending', 
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),

    CONSTRAINT FK_Bookings_User FOREIGN KEY (user_id) REFERENCES Users(user_id),
    CONSTRAINT FK_Bookings_Vehicle FOREIGN KEY (vehicle_id) REFERENCES Vehicles(vehicle_id),
    CONSTRAINT CK_Booking_Status CHECK (booking_status IN ('Pending', 'Confirmed', 'Completed', 'Cancelled'))
);
GO

--  Payments Table
CREATE TABLE Payments (
    payment_id INT IDENTITY(1,1) PRIMARY KEY,
    booking_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_status NVARCHAR(20) DEFAULT 'Pending', 
    payment_date DATETIME DEFAULT GETDATE(),
    payment_method NVARCHAR(50), 
    transaction_id NVARCHAR(100), 
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),

    CONSTRAINT FK_Payments_Booking FOREIGN KEY (booking_id) REFERENCES Bookings(booking_id)
);
GO

-- Customer Support Tickets Table
CREATE TABLE CustomerSupportTickets (
    ticket_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    subject NVARCHAR(100) NOT NULL,
    description NVARCHAR(MAX) NOT NULL,
    status NVARCHAR(20) DEFAULT 'Open', -- initial state where we can have it in multiple states ie sorted, fowarded for approval etc
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),

    CONSTRAINT FK_Tickets_User FOREIGN KEY (user_id) REFERENCES Users(user_id)
);
GO

