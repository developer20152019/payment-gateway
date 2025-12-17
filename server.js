import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// --- AI Initialization ---
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Helpers ---
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

// --- API Routes ---

// Gemini AI Summary (Used if needed in other pages, removed from ViewInvoice)
app.post('/api/ai/summarize', async (req, res) => {
    const { invoiceData } = req.body;
    try {
        const ai = getAI();
        const prompt = `Act as a professional financial assistant for ${invoiceData.businessName}. 
        Write a short, polite, and friendly 2-sentence summary note for a customer named ${invoiceData.buyerName} 
        regarding their ${invoiceData.type.toLowerCase()} #${invoiceData.invoiceNumber} for a total of ${invoiceData.total} ${invoiceData.currency}. 
        Mention the items: ${invoiceData.items.map(i => i.name).join(', ')}. No markdown.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });

        res.json({ text: response.text });
    } catch (err) {
        console.error('Gemini AI Error:', err);
        res.status(500).json({ error: 'AI generation failed' });
    }
});

// Authentication
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await pool.query('SELECT ID, Email, Name FROM Users WHERE Email = ? AND Password = ?', [email, password]);
        if (rows.length > 0) {
            res.json({ success: true, user: { id: rows[0].ID, name: rows[0].Name, email: rows[0].Email } });
        } else {
            res.status(401).json({ error: 'Invalid email or password' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Server authentication error' });
    }
});

// Products
app.get('/api/products', async (req, res) => {
    const [rows] = await pool.query('SELECT ID as id, Name as name, Description as description, Rate as rate FROM Products');
    res.json(rows);
});

app.post('/api/products', async (req, res) => {
    const { id, name, description, rate } = req.body;
    await pool.query('INSERT INTO Products (ID, Name, Description, Rate) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE Name=?, Description=?, Rate=?', [id, name, description, rate, name, description, rate]);
    res.json({ success: true });
});

// Customers - FIXED: Included PlaceOfSupply and PinCode in SELECT and correctly mapped UPDATE
app.get('/api/customers', async (req, res) => {
    const [rows] = await pool.query('SELECT ID as id, Name as name, Email as email, Phone as phone, Address as address, Gstin as gstin, PlaceOfSupply as placeOfSupply, PinCode as pinCode FROM Customers');
    res.json(rows);
});

app.post('/api/customers', async (req, res) => {
    const { id, name, email, phone, address, gstin, placeOfSupply, pinCode } = req.body;
    try {
        await pool.query(`
            INSERT INTO Customers (ID, Name, Email, Phone, Address, Gstin, PlaceOfSupply, PinCode) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?) 
            ON DUPLICATE KEY UPDATE 
                Name=?, Email=?, Phone=?, Address=?, Gstin=?, PlaceOfSupply=?, PinCode=?
        `, [
            id, name, email, phone, address, gstin, placeOfSupply, pinCode, 
            name, email, phone, address, gstin, placeOfSupply, pinCode
        ]);
        res.json({ success: true });
    } catch (err) {
        console.error('Customer Save Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Settings / Seller Profile
app.get('/api/settings/seller', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM SellerProfile LIMIT 1');
        if (rows.length === 0) return res.json({});
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/settings/seller', async (req, res) => {
    const s = req.body;
    try {
        await pool.query(`
            INSERT INTO SellerProfile (ID, SellerName, BusinessName, SellerAddress, SellerGstin, SellerEmail, SellerPhone, LogoUrl, BrandColor)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE SellerName=?, BusinessName=?, SellerAddress=?, SellerGstin=?, SellerEmail=?, SellerPhone=?, LogoUrl=?, BrandColor=?
        `, [
            'SINGLE_PROFILE', s.sellerName, s.businessName, s.sellerAddress, s.sellerGstin, s.sellerEmail, s.sellerPhone, s.logoUrl, s.brandColor,
            s.sellerName, s.businessName, s.sellerAddress, s.sellerGstin, s.sellerEmail, s.sellerPhone, s.logoUrl, s.brandColor
        ]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Invoices
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

app.delete('/api/invoices/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM Invoices WHERE ID = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
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
            INSERT INTO Invoices (ID, InvoiceNumber, PaidInvoiceNumber, Type, Date, DueDate, Template, BrandColor, LogoUrl, SellerName, BusinessName, SellerAddress, SellerGstin, SellerEmail, SellerPhone, BuyerName, BuyerEmail, BuyerPhone, BuyerAddress, Subtotal, TaxRate, TaxAmount, Total, Currency, Status, PaymentGateway, Notes)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            ON DUPLICATE KEY UPDATE InvoiceNumber=?, PaidInvoiceNumber=?, Type=?, Date=?, DueDate=?, Status=?, PaymentGateway=?, Notes=?
        `, [
            inv.id, inv.invoiceNumber, inv.paidInvoiceNumber, inv.type, sqlDate, sqlDueDate, inv.template, inv.brandColor, inv.logoUrl, inv.sellerName, inv.businessName, inv.sellerAddress, inv.sellerGstin, inv.sellerEmail, inv.sellerPhone, inv.buyerName, inv.buyerEmail, inv.buyerPhone, inv.buyerAddress, inv.subtotal, inv.taxRate, inv.taxAmount, inv.total, inv.currency, inv.status, inv.paymentGateway, inv.notes,
            inv.invoiceNumber, inv.paidInvoiceNumber, inv.type, sqlDate, sqlDueDate, inv.status, inv.paymentGateway, inv.notes
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
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

// Notifications (Email & WhatsApp Mock)
app.post('/api/notify', async (req, res) => {
    const { to, subject, body, attachments } = req.body;
    console.log(`Email notification request to: ${to}, Subject: ${subject}`);
    
    // Stub for Nodemailer if configured
    if (process.env.SMTP_HOST) {
        try {
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT,
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            });
            await transporter.sendMail({
                from: process.env.SMTP_FROM || '"Wappie Finance" <no-reply@wappie.in>',
                to, subject, html: body, attachments
            });
            return res.json({ success: true, message: 'Email sent' });
        } catch (e) {
            console.error('SMTP Error:', e);
            return res.status(500).json({ error: 'SMTP failed' });
        }
    }
    
    res.json({ success: true, message: 'Notification received (Mock mode - no SMTP configured)' });
});

app.post('/api/whatsapp/send', (req, res) => {
    console.log(`WhatsApp request for: ${req.body.to}`);
    res.json({ success: true, message: 'WhatsApp mock sent' });
});

// --- Static Frontend Serving (Production Only) ---
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(distPath, 'index.html'));
    } else {
        res.status(404).json({ error: 'API route not found' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});