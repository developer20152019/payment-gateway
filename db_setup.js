
import 'dotenv/config';
import mysql from 'mysql2/promise';

const dbConfig = {
    host: process.env.DB_SERVER || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'PayLinkDB',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306
};

async function setupDatabase() {
    console.log("🚀 Initializing PayLink Production Database Schema...");
    let connection;
    try {
        connection = await mysql.createConnection({
            host: dbConfig.host,
            user: dbConfig.user,
            password: dbConfig.password,
            port: dbConfig.port
        });

        await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
        await connection.query(`USE ${dbConfig.database}`);

        // Users Table
        await connection.query(`CREATE TABLE IF NOT EXISTS Users (
            ID VARCHAR(50) PRIMARY KEY,
            Username VARCHAR(50) UNIQUE,
            Email VARCHAR(100) UNIQUE,
            Password VARCHAR(255),
            Role VARCHAR(20) DEFAULT 'ADMIN'
        )`);

        // Resources Table (Dynamic Dropdowns)
        await connection.query(`CREATE TABLE IF NOT EXISTS Resources (
            ID VARCHAR(50) PRIMARY KEY,
            Name VARCHAR(100),
            Type ENUM('SECTION', 'NAME'),
            Value VARCHAR(100)
        )`);

        // Seed Default Admin if not exists
        const [users] = await connection.query("SELECT * FROM Users WHERE Username = 'admin'");
        if (users.length === 0) {
            await connection.query("INSERT INTO Users (ID, Username, Email, Password) VALUES (?, ?, ?, ?)", 
                ['u_1', 'admin', 'admin@paylink.com', 'admin123']);
            console.log("✅ Default admin user created (admin / admin123)");
        }

        // Seed Default Resources if empty
        const [res] = await connection.query("SELECT * FROM Resources");
        if (res.length === 0) {
            const defaultRes = [
                ['r1', 'Google', 'SECTION', 'Google'],
                ['r2', 'Facebook', 'SECTION', 'Facebook'],
                ['r3', 'Linkedin', 'SECTION', 'Linkedin'],
                ['r4', 'Cold Calling', 'SECTION', 'Cold Calling'],
                ['r5', 'Swapan Dutta', 'NAME', 'Swapan Dutta'],
                ['r6', 'Sharbhashish Nayak', 'NAME', 'Sharbhashish Nayak'],
                ['r7', 'Dipraj Nath', 'NAME', 'Dipraj Nath']
            ];
            await connection.query("INSERT INTO Resources (ID, Name, Type, Value) VALUES ?", [defaultRes]);
            console.log("✅ Default resources seeded.");
        }

        // Existing Tables...
        await connection.query(`CREATE TABLE IF NOT EXISTS Invoices (
            ID VARCHAR(50) PRIMARY KEY,
            InvoiceNumber VARCHAR(50),
            PaidInvoiceNumber VARCHAR(50), 
            Type VARCHAR(20) DEFAULT 'INVOICE',
            Date DATETIME,
            DueDate DATETIME,
            Template VARCHAR(50),
            BrandColor VARCHAR(20),
            LogoUrl LONGTEXT,
            SellerName VARCHAR(100),
            BusinessName VARCHAR(100),
            SellerAddress TEXT,
            SellerGstin VARCHAR(50),
            SellerEmail VARCHAR(100),
            SellerPhone VARCHAR(50),
            BuyerName VARCHAR(100),
            BuyerContactPerson VARCHAR(100),
            BuyerEmail VARCHAR(100),
            BuyerPhone VARCHAR(50),
            BuyerAddress TEXT,
            BuyerShippingAddress TEXT,
            PlaceOfSupply VARCHAR(100),
            BuyerPinCode VARCHAR(20),
            ResourceSection VARCHAR(100),
            ResourceName VARCHAR(100),
            Subtotal DECIMAL(18, 2) DEFAULT 0,
            TaxRate DECIMAL(5, 2) DEFAULT 0,
            TaxAmount DECIMAL(18, 2) DEFAULT 0,
            Total DECIMAL(18, 2) DEFAULT 0,
            Currency VARCHAR(10),
            Status VARCHAR(20) DEFAULT 'PENDING',
            PaymentGateway VARCHAR(50),
            Notes TEXT
        )`);

        await connection.query(`CREATE TABLE IF NOT EXISTS LineItems (
            ID VARCHAR(50) PRIMARY KEY,
            InvoiceID VARCHAR(50),
            ItemName VARCHAR(255),
            Description TEXT,
            Quantity DECIMAL(18, 2),
            Rate DECIMAL(18, 2),
            Amount DECIMAL(18, 2),
            FOREIGN KEY (InvoiceID) REFERENCES Invoices(ID) ON DELETE CASCADE
        )`);

        await connection.query(`CREATE TABLE IF NOT EXISTS Products (
            ID VARCHAR(50) PRIMARY KEY,
            Name VARCHAR(255),
            Description TEXT,
            Rate DECIMAL(18, 2)
        )`);

        await connection.query(`CREATE TABLE IF NOT EXISTS Customers (
            ID VARCHAR(50) PRIMARY KEY,
            Name VARCHAR(255),
            ContactPerson VARCHAR(255),
            Email VARCHAR(255),
            Phone VARCHAR(50),
            Address TEXT,
            ShippingAddress TEXT,
            Gstin VARCHAR(50),
            PlaceOfSupply VARCHAR(100),
            PinCode VARCHAR(20)
        )`);

        await connection.query(`CREATE TABLE IF NOT EXISTS Settings (
            ID INT PRIMARY KEY DEFAULT 1,
            SellerName VARCHAR(100),
            BusinessName VARCHAR(100),
            SellerAddress TEXT,
            SellerGstin VARCHAR(50),
            SellerEmail VARCHAR(100),
            SellerPhone VARCHAR(50),
            LogoUrl LONGTEXT,
            BrandColor VARCHAR(20),
            CHECK (ID = 1)
        )`);

        console.log("✅ Database tables ensured and verified.");
    } catch (err) {
        console.error("❌ Setup failed:", err.message);
    } finally {
        if (connection) await connection.end();
    }
}

setupDatabase();
