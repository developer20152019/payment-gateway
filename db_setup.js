const sql = require('mssql');

// Configuration for LocalDB
const config = {
    server: '(localdb)\\MSSQLLocalDB', 
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

async function setupDatabase() {
    console.log("🚀 Starting Database Setup...");
    let pool;

    try {
        // 1. Connect to Master to create DB
        console.log("   Connecting to SQL Server instance...");
        pool = await sql.connect(config);
        
        console.log("   Checking if 'PayLinkDB' exists...");
        await pool.query`IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'PayLinkDB') CREATE DATABASE PayLinkDB`;
        console.log("   ✅ Database 'PayLinkDB' ensured.");
        
        await pool.close();

        // 2. Connect to specific DB to create Tables
        const dbConfig = { ...config, database: 'PayLinkDB' };
        pool = await sql.connect(dbConfig);

        // 3. Create Tables
        console.log("   Setting up tables...");

        // Invoices
        await pool.query(`
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Invoices')
            CREATE TABLE Invoices (
                ID NVARCHAR(50) PRIMARY KEY,
                InvoiceNumber NVARCHAR(50),
                Type NVARCHAR(20) DEFAULT 'INVOICE',
                Date DATE,
                DueDate DATE,
                Template NVARCHAR(50),
                BrandColor NVARCHAR(20),
                LogoUrl NVARCHAR(MAX),
                SellerName NVARCHAR(100),
                BusinessName NVARCHAR(100),
                SellerAddress NVARCHAR(MAX),
                SellerGstin NVARCHAR(50),
                SellerEmail NVARCHAR(100),
                SellerPhone NVARCHAR(50),
                BuyerName NVARCHAR(100),
                BuyerEmail NVARCHAR(100),
                BuyerPhone NVARCHAR(50),
                BuyerAddress NVARCHAR(MAX),
                ResourceSection NVARCHAR(100),
                ResourceName NVARCHAR(100),
                Subtotal DECIMAL(18, 2) DEFAULT 0,
                TaxRate DECIMAL(5, 2) DEFAULT 0,
                TaxAmount DECIMAL(18, 2) DEFAULT 0,
                Total DECIMAL(18, 2) DEFAULT 0,
                Currency NVARCHAR(10),
                Status NVARCHAR(20) DEFAULT 'PENDING',
                PaymentGateway NVARCHAR(50),
                Notes NVARCHAR(MAX)
            )
        `);
        console.log("   ✅ Table 'Invoices' ensured.");

        // LineItems
        await pool.query(`
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'LineItems')
            CREATE TABLE LineItems (
                ID NVARCHAR(50) PRIMARY KEY,
                InvoiceID NVARCHAR(50) FOREIGN KEY REFERENCES Invoices(ID) ON DELETE CASCADE,
                ItemName NVARCHAR(100),
                Description NVARCHAR(MAX),
                Quantity DECIMAL(18, 2) DEFAULT 0,
                Rate DECIMAL(18, 2) DEFAULT 0,
                Amount DECIMAL(18, 2) DEFAULT 0
            )
        `);
        console.log("   ✅ Table 'LineItems' ensured.");

        // Products
        await pool.query(`
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Products')
            CREATE TABLE Products (
                ID NVARCHAR(50) PRIMARY KEY,
                Name NVARCHAR(100),
                Description NVARCHAR(MAX),
                Rate DECIMAL(18, 2) DEFAULT 0
            )
        `);
        console.log("   ✅ Table 'Products' ensured.");

        console.log("\n🎉 Setup Complete! You can now run 'node server.js'.");

    } catch (err) {
        console.error("\n❌ Error setting up database:", err.message);
        console.log("   Hint: Ensure SQL Server LocalDB is installed and running.");
    } finally {
        if (pool) await pool.close();
    }
}

setupDatabase();