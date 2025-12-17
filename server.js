
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mysql = require('mysql2/promise');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// --- Database Connection ---
const dbConfig = {
    host: process.env.DB_SERVER || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'PayLinkDB',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

// Test DB Connection
(async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Connected to MySQL Database');
        connection.release();
    } catch (err) {
        console.error('❌ Database Connection Failed:', err.message);
        console.log('   Note: Login will work with admin fallback if DB is offline.');
    }
})();

// --- Helper: Generate Next Paid Invoice Number ---
async function generatePaidInvoiceNumber() {
    try {
        const [rows] = await pool.query("SELECT COUNT(*) as count FROM Invoices WHERE PaidInvoiceNumber IS NOT NULL AND PaidInvoiceNumber != ''");
        const count = rows[0].count;
        const nextNum = count + 1;
        return `INV-${nextNum.toString().padStart(5, '0')}`;
    } catch (e) {
        console.error("Error generating invoice number:", e);
        return `EST-${Date.now()}`;
    }
}

// --- Helper: Format ISO String to MySQL DATETIME in IST ---
function toMysqlDateTime(isoString) {
    if (!isoString) isoString = new Date().toISOString();
    try {
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return toMysqlDateTime(new Date().toISOString());
        const istOffset = 19800000;
        const istDate = new Date(d.getTime() + istOffset);
        const yyyy = istDate.getUTCFullYear();
        const mm = String(istDate.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(istDate.getUTCDate()).padStart(2, '0');
        const hh = String(istDate.getUTCHours()).padStart(2, '0');
        const min = String(istDate.getUTCMinutes()).padStart(2, '0');
        const ss = String(istDate.getUTCSeconds()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
    } catch (e) {
        return new Date().toISOString().slice(0, 19).replace('T', ' ');
    }
}

// --- API Routes ---

// 0. AUTHENTICATION
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await pool.query('SELECT Email, Name FROM Users WHERE Email = ? AND Password = ?', [email, password]);
        if (rows.length > 0) {
            return res.json({ success: true, user: rows[0] });
        } else {
            return res.status(401).json({ success: false, error: 'Invalid email or password' });
        }
    } catch (err) {
        console.error("Login Error:", err);
        // If DB table doesn't exist yet, provide a clear JSON error
        return res.status(500).json({ success: false, error: 'Database error: ' + err.message });
    }
});

// 1. PRODUCTS
app.get('/api/products', async (req, res) => {
    try {
        const [rows] = await pool.query(`SELECT ID as id, Name as name, Description as description, Rate as rate FROM Products`);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/products', async (req, res) => {
    const { id, name, description, rate } = req.body;
    try {
        await pool.query(`
            INSERT INTO Products (ID, Name, Description, Rate) VALUES (?, ?, ?, ?) 
            ON DUPLICATE KEY UPDATE Name=?, Description=?, Rate=?
        `, [id, name, description, rate, name, description, rate]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM Products WHERE ID = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. CUSTOMERS
app.get('/api/customers', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT ID as id, Name as name, ContactPerson as contactPerson, Email as email, Phone as phone, Address as address, ShippingAddress as shippingAddress, Gstin as gstin, PlaceOfSupply as placeOfSupply, PinCode as pinCode FROM Customers
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/customers', async (req, res) => {
    const { id, name, contactPerson, email, phone, address, shippingAddress, gstin, placeOfSupply, pinCode } = req.body;
    try {
        await pool.query(`
            INSERT INTO Customers (ID, Name, ContactPerson, Email, Phone, Address, ShippingAddress, Gstin, PlaceOfSupply, PinCode) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
            ON DUPLICATE KEY UPDATE Name=?, ContactPerson=?, Email=?, Phone=?, Address=?, ShippingAddress=?, Gstin=?, PlaceOfSupply=?, PinCode=?
        `, [id, name, contactPerson, email, phone, address, shippingAddress, gstin, placeOfSupply, pinCode, name, contactPerson, email, phone, address, shippingAddress, gstin, placeOfSupply, pinCode]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/customers/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM Customers WHERE ID = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. SELLER SETTINGS
app.get('/api/settings/seller', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT ID as id, SellerName as sellerName, BusinessName as businessName, SellerAddress as sellerAddress, SellerGstin as sellerGstin, SellerEmail as sellerEmail, SellerPhone as sellerPhone, LogoUrl as logoUrl, BrandColor as brandColor FROM SellerProfile LIMIT 1
        `);
        res.json(rows.length > 0 ? rows[0] : {});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/settings/seller', async (req, res) => {
    const { sellerName, businessName, sellerAddress, sellerGstin, sellerEmail, sellerPhone, logoUrl, brandColor } = req.body;
    const fixedId = 'profile_default';
    try {
        await pool.query(`
            INSERT INTO SellerProfile (ID, SellerName, BusinessName, SellerAddress, SellerGstin, SellerEmail, SellerPhone, LogoUrl, BrandColor)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE SellerName=?, BusinessName=?, SellerAddress=?, SellerGstin=?, SellerEmail=?, SellerPhone=?, LogoUrl=?, BrandColor=?
        `, [fixedId, sellerName, businessName, sellerAddress, sellerGstin, sellerEmail, sellerPhone, logoUrl, brandColor, sellerName, businessName, sellerAddress, sellerGstin, sellerEmail, sellerPhone, logoUrl, brandColor]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. INVOICES
app.get('/api/invoices', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM Invoices ORDER BY Date DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/invoices/:id', async (req, res) => {
    try {
        const [invoices] = await pool.query('SELECT * FROM Invoices WHERE ID = ?', [req.params.id]);
        if (invoices.length === 0) return res.status(404).json({ error: 'Not found' });
        const invoice = invoices[0];
        const [items] = await pool.query(`SELECT ID as id, ItemName as name, Description as description, Quantity as quantity, Rate as rate, Amount as amount FROM LineItems WHERE InvoiceID = ?`, [invoice.ID]);
        invoice.items = items;
        res.json(invoice);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/invoices', async (req, res) => {
    const inv = req.body;
    const connection = await pool.getConnection();
    if (inv.status === 'PAID' && (!inv.paidInvoiceNumber || inv.paidInvoiceNumber === '')) {
        inv.paidInvoiceNumber = await generatePaidInvoiceNumber();
    }
    const sqlDate = toMysqlDateTime(inv.date);
    const sqlDueDate = toMysqlDateTime(inv.dueDate);
    try {
        await connection.beginTransaction();
        await connection.query(`
            INSERT INTO Invoices 
            (ID, InvoiceNumber, PaidInvoiceNumber, Type, Date, DueDate, Template, BrandColor, LogoUrl, SellerName, BusinessName, SellerAddress, 
            SellerGstin, SellerEmail, SellerPhone, BuyerName, BuyerContactPerson, BuyerEmail, BuyerPhone, BuyerAddress, BuyerShippingAddress, PlaceOfSupply, BuyerPinCode,
            ResourceSection, ResourceName, Subtotal, TaxRate, TaxAmount, Total, Currency, Status, PaymentGateway, Notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            InvoiceNumber=?, PaidInvoiceNumber=?, Type=?, Date=?, DueDate=?, Template=?, BrandColor=?, LogoUrl=?, SellerName=?, BusinessName=?, SellerAddress=?,
            SellerGstin=?, SellerEmail=?, SellerPhone=?, BuyerName=?, BuyerContactPerson=?, BuyerEmail=?, BuyerPhone=?, BuyerAddress=?, BuyerShippingAddress=?, PlaceOfSupply=?, BuyerPinCode=?,
            ResourceSection=?, ResourceName=?, Subtotal=?, TaxRate=?, TaxAmount=?, Total=?, Currency=?, Status=?, PaymentGateway=?, Notes=?
        `, [
            inv.id, inv.invoiceNumber, inv.paidInvoiceNumber, inv.type, sqlDate, sqlDueDate, inv.template, inv.brandColor, inv.logoUrl, inv.sellerName, inv.businessName, inv.sellerAddress,
            inv.sellerGstin, inv.sellerEmail, inv.sellerPhone, inv.buyerName, inv.buyerContactPerson, inv.buyerEmail, inv.buyerPhone, inv.buyerAddress, inv.buyerShippingAddress, inv.placeOfSupply, inv.buyerPinCode,
            inv.resourceSection, inv.resourceName, inv.subtotal, inv.taxRate, inv.taxAmount, inv.total, inv.currency, inv.status, inv.paymentGateway, inv.notes,
            inv.invoiceNumber, inv.paidInvoiceNumber, inv.type, sqlDate, sqlDueDate, inv.template, inv.brandColor, inv.logoUrl, inv.sellerName, inv.businessName, inv.sellerAddress,
            inv.sellerGstin, inv.sellerEmail, inv.sellerPhone, inv.buyerName, inv.buyerContactPerson, inv.buyerEmail, inv.buyerPhone, inv.buyerAddress, inv.buyerShippingAddress, inv.placeOfSupply, inv.buyerPinCode,
            inv.resourceSection, inv.resourceName, inv.subtotal, inv.taxRate, inv.taxAmount, inv.total, inv.currency, inv.status, inv.paymentGateway, inv.notes
        ]);
        await connection.query('DELETE FROM LineItems WHERE InvoiceID = ?', [inv.id]);
        if (inv.items && inv.items.length > 0) {
            const itemValues = inv.items.map((item, index) => [`li_${Date.now()}_${index}`, inv.id, item.name, item.description, item.quantity, item.rate, item.amount]);
            await connection.query('INSERT INTO LineItems (ID, InvoiceID, ItemName, Description, Quantity, Rate, Amount) VALUES ?', [itemValues]);
        }
        await connection.commit();
        res.json({ success: true, id: inv.id, paidInvoiceNumber: inv.paidInvoiceNumber });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

app.delete('/api/invoices/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM Invoices WHERE ID = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Final catch-all for /api routes to ensure JSON is returned for 404s
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: `API route ${req.originalUrl} not found` });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
