
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// --- Serve React Build Files (Production) ---
app.use(express.static(path.join(__dirname, 'dist')));

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
    }
})();

// Helper: Generate Paid Invoice Number
async function generatePaidInvoiceNumber() {
    try {
        const [rows] = await pool.query("SELECT COUNT(*) as count FROM Invoices WHERE PaidInvoiceNumber IS NOT NULL AND PaidInvoiceNumber != ''");
        const count = rows[0].count;
        return `INV-${(count + 1).toString().padStart(5, '0')}`;
    } catch (e) {
        return `INV-${Date.now()}`;
    }
}

function toMysqlDateTime(isoString) {
    const d = isoString ? new Date(isoString) : new Date();
    const istOffset = 19800000; // 5.5 hours
    const istDate = new Date(d.getTime() + istOffset);
    return istDate.toISOString().slice(0, 19).replace('T', ' ');
}

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder'
});

const ccav = {
    encrypt: (plainText, workingKey) => {
        const m = crypto.createHash('md5').update(workingKey).digest();
        const iv = Buffer.from('\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0a\x0b\x0c\x0d\x0e\x0f', 'binary');
        const cipher = crypto.createCipheriv('aes-128-cbc', m, iv);
        let encoded = cipher.update(plainText, 'utf8', 'hex');
        encoded += cipher.final('hex');
        return encoded;
    },
    decrypt: (encText, workingKey) => {
        const m = crypto.createHash('md5').update(workingKey).digest();
        const iv = Buffer.from('\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0a\x0b\x0c\x0d\x0e\x0f', 'binary');
        const decipher = crypto.createDecipheriv('aes-128-cbc', m, iv);
        let decoded = decipher.update(encText, 'hex', 'utf8');
        decoded += decipher.final('utf8');
        return decoded;
    }
};

// API Routes
app.get('/api/products', async (req, res) => {
    try {
        const [rows] = await pool.query(`SELECT ID as id, Name as name, Description as description, Rate as rate FROM Products`);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/invoices', async (req, res) => {
    const inv = req.body;
    if (inv.status === 'PAID' && !inv.paidInvoiceNumber) {
        inv.paidInvoiceNumber = await generatePaidInvoiceNumber();
    }
    const sqlDate = toMysqlDateTime(inv.date);
    const sqlDueDate = toMysqlDateTime(inv.dueDate);

    try {
        await pool.query(`
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

        await pool.query('DELETE FROM LineItems WHERE InvoiceID = ?', [inv.id]);
        if (inv.items?.length > 0) {
            const itemValues = inv.items.map((item, idx) => [`li_${Date.now()}_${idx}`, inv.id, item.name, item.description, item.quantity, item.rate, item.amount]);
            await pool.query('INSERT INTO LineItems (ID, InvoiceID, ItemName, Description, Quantity, Rate, Amount) VALUES ?', [itemValues]);
        }
        res.json({ success: true, id: inv.id, paidInvoiceNumber: inv.paidInvoiceNumber });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).json({ error: 'API not found' });
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
