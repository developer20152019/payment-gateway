
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

// --- Serve React Build Files ---
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

// --- AUTH API ---
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await pool.query("SELECT * FROM Users WHERE Email = ? AND Password = ?", [email, password]);
        if (rows.length > 0) {
            const user = rows[0];
            res.json({ 
                success: true, 
                user: { id: user.ID, username: user.Username, email: user.Email } 
            });
        } else {
            res.status(401).json({ success: false, error: 'Invalid email or password' });
        }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- RESOURCES API (Dynamic Dropdowns) ---
app.get('/api/resources', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM Resources");
        const sections = rows.filter(r => r.Type === 'SECTION').map(r => r.Value);
        const names = rows.filter(r => r.Type === 'NAME').map(r => r.Value);
        res.json({ sections, names });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- INVOICES API ---
app.get('/api/invoices', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM Invoices ORDER BY Date DESC");
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/invoices/:id', async (req, res) => {
    try {
        const [invRows] = await pool.query("SELECT * FROM Invoices WHERE ID = ?", [req.params.id]);
        if (invRows.length === 0) return res.status(404).json({ error: 'Not found' });
        
        const [itemRows] = await pool.query("SELECT ID, ItemName, Description, Quantity, Rate, Amount FROM LineItems WHERE InvoiceID = ?", [req.params.id]);
        const invoice = invRows[0];
        invoice.items = itemRows;
        res.json(invoice);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Helper: IST DateTime
function toMysqlDateTime(isoString) {
    const d = isoString ? new Date(isoString) : new Date();
    const istOffset = 19800000; 
    const istDate = new Date(d.getTime() + istOffset);
    return istDate.toISOString().slice(0, 19).replace('T', ' ');
}

// Helper: Sequential INV Numbers
async function generatePaidInvoiceNumber() {
    try {
        const [rows] = await pool.query("SELECT COUNT(*) as count FROM Invoices WHERE PaidInvoiceNumber IS NOT NULL AND PaidInvoiceNumber != ''");
        const count = rows[0].count;
        return `INV-${(count + 1).toString().padStart(5, '0')}`;
    } catch (e) {
        return `INV-${Date.now()}`;
    }
}

app.post('/api/invoices', async (req, res) => {
    const inv = req.body;
    if (inv.status === 'PAID' && !inv.paidInvoiceNumber && inv.type === 'INVOICE') {
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
            const itemValues = inv.items.map((item) => [
                item.id || `li_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                inv.id, item.name, item.description, item.quantity, item.rate, item.amount
            ]);
            await pool.query('INSERT INTO LineItems (ID, InvoiceID, ItemName, Description, Quantity, Rate, Amount) VALUES ?', [itemValues]);
        }
        res.json({ success: true, id: inv.id, paidInvoiceNumber: inv.paidInvoiceNumber });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/invoices/:id', async (req, res) => {
    try {
        await pool.query("DELETE FROM Invoices WHERE ID = ?", [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- API ROUTES: PRODUCTS ---
app.get('/api/products', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT ID as id, Name as name, Description as description, Rate as rate FROM Products");
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/products', async (req, res) => {
    const p = req.body;
    try {
        await pool.query("INSERT INTO Products (ID, Name, Description, Rate) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE Name=?, Description=?, Rate=?", 
            [p.id, p.name, p.description, p.rate, p.name, p.description, p.rate]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        await pool.query("DELETE FROM Products WHERE ID = ?", [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- API ROUTES: CUSTOMERS ---
app.get('/api/customers', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM Customers");
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/customers', async (req, res) => {
    const c = req.body;
    try {
        await pool.query(`INSERT INTO Customers (ID, Name, ContactPerson, Email, Phone, Address, ShippingAddress, Gstin, PlaceOfSupply, PinCode)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE Name=?, ContactPerson=?, Email=?, Phone=?, Address=?, ShippingAddress=?, Gstin=?, PlaceOfSupply=?, PinCode=?`,
            [c.id, c.name, c.contactPerson, c.email, c.phone, c.address, c.shippingAddress, c.gstin, c.placeOfSupply, c.pinCode,
             c.name, c.contactPerson, c.email, c.phone, c.address, c.shippingAddress, c.gstin, c.placeOfSupply, c.pinCode]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/customers/:id', async (req, res) => {
    try {
        await pool.query("DELETE FROM Customers WHERE ID = ?", [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- API ROUTES: SETTINGS ---
app.get('/api/settings/seller', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM Settings WHERE ID = 1");
        res.json(rows[0] || {});
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/settings/seller', async (req, res) => {
    const s = req.body;
    try {
        await pool.query(`INSERT INTO Settings (ID, SellerName, BusinessName, SellerAddress, SellerGstin, SellerEmail, SellerPhone, LogoUrl, BrandColor)
            VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE SellerName=?, BusinessName=?, SellerAddress=?, SellerGstin=?, SellerEmail=?, SellerPhone=?, LogoUrl=?, BrandColor=?`,
            [s.sellerName, s.businessName, s.sellerAddress, s.sellerGstin, s.sellerEmail, s.sellerPhone, s.logoUrl, s.brandColor,
             s.sellerName, s.businessName, s.sellerAddress, s.sellerGstin, s.sellerEmail, s.sellerPhone, s.logoUrl, s.brandColor]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- NOTIFICATIONS & PAYMENTS ---
app.post('/api/notify', async (req, res) => {
    console.log("Email Notification requested for:", req.body.to);
    res.json({ success: true, message: "Email logic stubbed (Configure SMTP in .env to enable)" });
});

app.post('/api/whatsapp/send', async (req, res) => {
    console.log("WhatsApp Notification requested for:", req.body.to);
    res.json({ success: true, message: "WhatsApp logic stubbed" });
});

app.post('/api/payment/razorpay/create-order', async (req, res) => {
    res.status(501).json({ error: "Razorpay Key ID not configured in .env" });
});

// --- CLIENT-SIDE ROUTING FALLBACK ---
app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).json({ error: 'API not found' });
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => console.log(`🚀 PayLink Backend running on http://localhost:${PORT}`));
