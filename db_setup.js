require('dotenv').config();
const mysql = require('mysql2/promise');

// Configuration from .env
const dbConfig = {
    host: process.env.DB_SERVER,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306
};

async function setupDatabase() {
    console.log("🚀 Starting Database Setup...");
    console.log(`   Target Server: ${dbConfig.host}`);
    console.log(`   Target Database: ${dbConfig.database}`);

    let connection;

    try {
        console.log("   Connecting to MySQL server...");
        connection = await mysql.createConnection(dbConfig);
        console.log("   ✅ Connected successfully.");

        console.log("   Setting up tables...");

        // Invoices Table
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
            )
        `);
        
        // Attempt to add/modify columns if they exist (Migration for dev)
        try { await connection.query("ALTER TABLE Invoices ADD COLUMN BuyerContactPerson VARCHAR(100)"); } catch(e) {}
        try { await connection.query("ALTER TABLE Invoices ADD COLUMN BuyerShippingAddress TEXT"); } catch(e) {}
        try { await connection.query("ALTER TABLE Invoices ADD COLUMN PlaceOfSupply VARCHAR(100)"); } catch(e) {}
        try { await connection.query("ALTER TABLE Invoices ADD COLUMN BuyerPinCode VARCHAR(20)"); } catch(e) {}
        try { await connection.query("ALTER TABLE Invoices ADD COLUMN PaidInvoiceNumber VARCHAR(50)"); } catch(e) {}
        
        // Migrate Date columns to DATETIME
        try { await connection.query("ALTER TABLE Invoices MODIFY COLUMN Date DATETIME"); } catch(e) {}
        try { await connection.query("ALTER TABLE Invoices MODIFY COLUMN DueDate DATETIME"); } catch(e) {}

        console.log("   ✅ Table 'Invoices' ensured.");

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
        console.log("   ✅ Table 'LineItems' ensured.");

        // Products
        await connection.query(`
            CREATE TABLE IF NOT EXISTS Products (
                ID VARCHAR(50) PRIMARY KEY,
                Name VARCHAR(100),
                Description TEXT,
                Rate DECIMAL(18, 2) DEFAULT 0
            )
        `);
        console.log("   ✅ Table 'Products' ensured.");

        // Customers
        await connection.query(`
            CREATE TABLE IF NOT EXISTS Customers (
                ID VARCHAR(50) PRIMARY KEY,
                Name VARCHAR(100),
                ContactPerson VARCHAR(100),
                Email VARCHAR(100),
                Phone VARCHAR(50),
                Address TEXT,
                ShippingAddress TEXT,
                Gstin VARCHAR(50),
                PlaceOfSupply VARCHAR(50),
                PinCode VARCHAR(20)
            )
        `);
        
        // Migration for Customers
        try { await connection.query("ALTER TABLE Customers ADD COLUMN ContactPerson VARCHAR(100)"); } catch(e) {}
        try { await connection.query("ALTER TABLE Customers ADD COLUMN ShippingAddress TEXT"); } catch(e) {}
        try { await connection.query("ALTER TABLE Customers ADD COLUMN PlaceOfSupply VARCHAR(50)"); } catch(e) {}
        try { await connection.query("ALTER TABLE Customers ADD COLUMN PinCode VARCHAR(20)"); } catch(e) {}

        console.log("   ✅ Table 'Customers' ensured.");

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
        console.log("   ✅ Table 'SellerProfile' ensured.");

        console.log("\n🎉 Setup Complete! You can now run 'node server.js'.");

    } catch (err) {
        console.error("\n❌ Error setting up database:", err.message);
        console.log("---------------------------------------------------");
        console.log("troubleshooting Hostinger Connections:");
        console.log("1. Ensure you created the Database in Hostinger Panel.");
        console.log("2. Ensure you added your IP (or %) in 'Remote MySQL' in Hostinger.");
        console.log("3. Check .env file values.");
        console.log("---------------------------------------------------");
    } finally {
        if (connection) await connection.end();
    }
}

setupDatabase();