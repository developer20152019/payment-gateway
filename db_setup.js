
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
    console.log("🚀 Initializing Database...");
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
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
        console.log("✅ Database tables ensured.");
    } catch (err) {
        console.error("❌ Setup failed:", err.message);
    } finally {
        if (connection) await connection.end();
    }
}

setupDatabase();
