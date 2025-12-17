import 'dotenv/config';
import mysql from 'mysql2/promise';

const dbConfig = {
    host: process.env.DB_SERVER || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306
};

async function setupDatabase() {
    console.log("🚀 Starting Production Database Setup...");
    
    if (!dbConfig.user || !dbConfig.database) {
        console.error("❌ ERROR: Missing database credentials in .env");
        process.exit(1);
    }

    let connection;

    try {
        connection = await mysql.createConnection(dbConfig);
        console.log("✅ Connected to database.");

        // Users
        await connection.query(`
            CREATE TABLE IF NOT EXISTS Users (
                ID VARCHAR(50) PRIMARY KEY,
                Email VARCHAR(100) UNIQUE NOT NULL,
                Password VARCHAR(100) NOT NULL,
                Name VARCHAR(100)
            )
        `);

        // Seed admin if empty
        await connection.query(`
            INSERT IGNORE INTO Users (ID, Email, Password, Name) 
            VALUES ('u_admin_01', 'admin@paylink.com', 'admin123', 'Administrator')
        `);

        // Invoices
        await connection.query(`
            CREATE TABLE IF NOT EXISTS Invoices (
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
                BuyerEmail VARCHAR(100),
                BuyerPhone VARCHAR(50),
                BuyerAddress TEXT,
                Subtotal DECIMAL(18, 2) DEFAULT 0,
                TaxRate DECIMAL(5, 2) DEFAULT 0,
                TaxAmount DECIMAL(18, 2) DEFAULT 0,
                Total DECIMAL(18, 2) DEFAULT 0,
                Currency VARCHAR(10),
                Status VARCHAR(20) DEFAULT 'PENDING',
                PaymentGateway VARCHAR(50),
                Notes TEXT
            )
        `);

        // LineItems
        await connection.query(`
            CREATE TABLE IF NOT EXISTS LineItems (
                ID VARCHAR(50) PRIMARY KEY,
                InvoiceID VARCHAR(50),
                ItemName VARCHAR(100),
                Description TEXT,
                Quantity DECIMAL(18, 2) DEFAULT 0,
                Rate DECIMAL(18, 2) DEFAULT 0,
                Amount DECIMAL(18, 2) DEFAULT 0,
                FOREIGN KEY (InvoiceID) REFERENCES Invoices(ID) ON DELETE CASCADE
            )
        `);

        // Products
        await connection.query(`
            CREATE TABLE IF NOT EXISTS Products (
                ID VARCHAR(50) PRIMARY KEY,
                Name VARCHAR(100),
                Description TEXT,
                Rate DECIMAL(18, 2) DEFAULT 0
            )
        `);

        // Customers
        await connection.query(`
            CREATE TABLE IF NOT EXISTS Customers (
                ID VARCHAR(50) PRIMARY KEY,
                Name VARCHAR(100),
                Email VARCHAR(100),
                Phone VARCHAR(50),
                Address TEXT,
                Gstin VARCHAR(50)
            )
        `);

        // SellerProfile
        await connection.query(`
            CREATE TABLE IF NOT EXISTS SellerProfile (
                ID VARCHAR(50) PRIMARY KEY,
                SellerName VARCHAR(100),
                BusinessName VARCHAR(100),
                SellerAddress TEXT,
                SellerGstin VARCHAR(50),
                SellerEmail VARCHAR(100),
                SellerPhone VARCHAR(50),
                LogoUrl LONGTEXT,
                BrandColor VARCHAR(20) DEFAULT '#4f46e5'
            )
        `);

        console.log("🎉 Database Setup Complete!");

    } catch (err) {
        console.error("❌ Setup failed:", err.message);
    } finally {
        if (connection) await connection.end();
    }
}

setupDatabase();