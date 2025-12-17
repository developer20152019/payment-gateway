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

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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

async function generatePaidInvoiceNumber() {
    try {
        const [rows] = await pool.query("SELECT COUNT(*) as count FROM Invoices WHERE PaidInvoiceNumber IS NOT NULL AND PaidInvoiceNumber != ''");
        const count = rows[0].count;
        return `INV-${(count + 1).toString().padStart(5, '0')}`;
    } catch (e) {
        return `INV-${Date.now().toString().slice(-5)}`;
    }
}

function toMysqlDateTime(isoString) {
    if (!isoString) isoString = new Date().toISOString();
    try {
        const d = new Date(isoString);
        const istOffset = 19800000; 
        const istDate = new Date(d.getTime() + istOffset);
        return istDate.getUTCFullYear() + '-' +
            String(istDate.getUTCMonth() + 1).padStart(2, '0') + '-' +
            String(istDate.getUTCDate()).padStart(2, '0') + ' ' +
            String(istDate.getUTCHours()).padStart(2, '0') + ':' +
            String(istDate.getUTCMinutes()).padStart(2, '0') + ':' +
            String(istDate.getUTCSeconds()).padStart(2, '0');
    } catch (e) {
        return new Date().toISOString().slice(0, 19).replace('T', ' ');
    }
}

// API Routes
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await pool.query('SELECT ID, Email, Name FROM Users WHERE Email = ? AND Password = ?', [email, password]);
        if (rows.length > 0) res.json({ success: true, user: { id: rows[0].ID, name: rows[0].Name, email: rows[0].Email } });
        else res.status(401).json({ error: 'Invalid credentials' });
    } catch (err) { res.status(500).json({ error: 'Auth error' }); }
});

app.get('/api/products', async (req, res) => {
    const [rows] = await pool.query('SELECT ID as id, Name as name, Description as description, Rate as rate FROM Products');
    res.json(rows);
});

app.post('/api/products', async (req, res) => {
    const { id, name, description, rate } = req.body;
    await pool.query('INSERT INTO Products (ID, Name, Description, Rate) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE Name=?, Description=?, Rate=?', [id, name, description, rate, name, description, rate]);
    res.json({ success: true });
});

app.get('/api/customers', async (req, res) => {
    const [rows] = await pool.query('SELECT ID as id, Name as name, Email as email, Phone as phone, Address as address, Gstin as gstin, PlaceOfSupply as placeOfSupply, PinCode as pinCode FROM Customers');
    res.json(rows);
});

app.post('/api/customers', async (req, res) => {
    const { id, name, email, phone, address, gstin, placeOfSupply, pinCode } = req.body;
    await pool.query('INSERT INTO Customers (ID, Name, Email, Phone, Address, Gstin, PlaceOfSupply, PinCode) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE Name=?, Email=?, Phone=?, Address=?, Gstin=?, PlaceOfSupply=?, PinCode=?', [id, name, email, phone, address, gstin, placeOfSupply, pinCode, name, email, phone, address, gstin, placeOfSupply, pinCode]);
    res.json({ success: true });
});

app.get('/api/invoices', async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM Invoices ORDER BY Date DESC');
    res.json(rows);
});

app.get('/api/invoices/:id', async (req, res) => {
    const [invoices] = await pool.query('SELECT * FROM Invoices WHERE ID = ?', [req.params.id]);
    if (invoices.length === 0) return res.status(404).json({ error: 'Not found' });
    const [items] = await pool.query('SELECT ID as id, ItemName as name, Description as description, Quantity as quantity, Rate as rate, Amount as amount FROM LineItems WHERE InvoiceID = ?', [req.params.id]);
    invoices[0].items = items;
    res.json(invoices[0]);
});

app.post('/api/invoices', async (req, res) => {
    const inv = req.body;
    const sqlDate = toMysqlDateTime(inv.date);
    const sqlDueDate = toMysqlDateTime(inv.dueDate);
    
    if (inv.status === 'PAID' && !inv.paidInvoiceNumber) {
        inv.paidInvoiceNumber = await generatePaidInvoiceNumber();
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        await connection.query(`
            INSERT INTO Invoices (
                ID, InvoiceNumber, PaidInvoiceNumber, Type, Date, DueDate, Template, BrandColor, LogoUrl, 
                SellerName, BusinessName, SellerAddress, SellerGstin, SellerEmail, SellerPhone, 
                BuyerName, BuyerEmail, BuyerPhone, BuyerAddress, BuyerShippingAddress, PlaceOfSupply, BuyerPinCode, 
                Subtotal, TaxRate, TaxAmount, Total, Currency, Status, PaymentGateway, Notes
            )
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            ON DUPLICATE KEY UPDATE 
                Status=VALUES(Status), 
                PaidInvoiceNumber=VALUES(PaidInvoiceNumber), 
                PaymentGateway=VALUES(PaymentGateway), 
                Notes=VALUES(Notes),
                BuyerAddress=VALUES(BuyerAddress),
                BuyerPhone=VALUES(BuyerPhone),
                BuyerEmail=VALUES(BuyerEmail)
        `, [
            inv.id, inv.invoiceNumber, inv.paidInvoiceNumber, inv.type, sqlDate, sqlDueDate, inv.template, inv.brandColor, inv.logoUrl, 
            inv.sellerName, inv.businessName, inv.sellerAddress, inv.sellerGstin, inv.sellerEmail, inv.sellerPhone, 
            inv.buyerName, inv.buyerEmail, inv.buyerPhone, inv.buyerAddress, inv.buyerShippingAddress, inv.placeOfSupply, inv.buyerPinCode, 
            inv.subtotal, inv.taxRate, inv.taxAmount, inv.total, inv.currency, inv.status, inv.paymentGateway, inv.notes
        ]);

        await connection.query('DELETE FROM LineItems WHERE InvoiceID = ?', [inv.id]);
        if (inv.items?.length > 0) {
            const itemValues = inv.items.map((it, idx) => [`li_${inv.id}_${idx}`, inv.id, it.name, it.description, it.quantity, it.rate, it.amount]);
            await connection.query('INSERT INTO LineItems (ID, InvoiceID, ItemName, Description, Quantity, Rate, Amount) VALUES ?', [itemValues]);
        }
        await connection.commit();
        res.json({ success: true, paidInvoiceNumber: inv.paidInvoiceNumber });
    } catch (err) {
        await connection.rollback();
        console.error("Save Error:", err);
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

// Real/Mock Notifications
app.post('/api/notify', async (req, res) => {
    const p = req.body;
    console.log(`[EMAIL SENDING] Trigger: ${p.type} | To: ${p.to} | Inv: ${p.invoiceNumber}`);
    
    if (process.env.SMTP_HOST) {
        try {
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT,
                secure: process.env.SMTP_SECURE === 'true',
                auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
            });
            await transporter.sendMail({
                from: process.env.SMTP_FROM || '"Wappie Finance" <no-reply@wappie.in>',
                to: p.to,
                subject: p.subject || `Document ${p.invoiceNumber} Notification`,
                html: `<div style="font-family:sans-serif;"><h3>Hello ${p.buyerName},</h3><p>Your ${p.type === 'PAID' ? 'receipt' : 'invoice'} for <b>${p.currency} ${p.total}</b> is ready.</p><p><a href="${p.link}">Click here to view document</a></p></div>`
            });
            return res.json({ success: true });
        } catch (e) { return res.status(500).json({ error: 'SMTP Error' }); }
    }
    res.json({ success: true, mock: true });
});

app.post('/api/whatsapp/send', (req, res) => {
    const p = req.body;
    console.log(`[WHATSAPP SENDING] Trigger: ${p.type} | To: ${p.to} | Link: ${p.link}`);
    res.json({ success: true, mock: true });
});

app.post('/api/payment/initiate', (req, res) => {
    const { amount, currency, order_id, billing_name } = req.body;
    res.send(`
        <html><body style="font-family:sans-serif; text-align:center; padding: 50px; background:#f4f7f6;">
            <div style="background:white; padding:30px; border-radius:15px; display:inline-block; border:1px solid #ddd;">
                <h2 style="color:#4f46e5;">Secure Checkout</h2>
                <p>Order: ${order_id}</p>
                <p>Payable: <b>${currency} ${amount}</b></p>
                <div style="margin-top:20px;">
                    <button style="padding:10px 20px; background:#10b981; color:white; border:none; border-radius:5px; cursor:pointer;" onclick="window.parent.postMessage('PAYMENT_SUCCESS', '*')">Simulate Success</button>
                    <button style="padding:10px 20px; background:#ef4444; color:white; border:none; border-radius:5px; cursor:pointer;" onclick="window.parent.postMessage('PAYMENT_CANCEL', '*')">Cancel</button>
                </div>
            </div>
        </body></html>
    `);
});

const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) res.sendFile(path.join(distPath, 'index.html'));
    else res.status(404).json({ error: 'API route not found' });
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));