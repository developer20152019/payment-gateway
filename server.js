require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const session = require('express-session'); // Required for Auth

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// =========================================================
// 1. MIDDLEWARE & SESSION CONFIGURATION
// =========================================================

// Trust Proxy (Required if hosting on Vercel, Heroku, Nginx, etc.)
app.set('trust proxy', 1);

app.use(cors({
    origin: process.env.APP_BASE_URL || ["http://localhost:5173", "http://localhost:3000"],
    credentials: true, // Essential for Cookies
    methods: ["GET", "POST", "PUT", "DELETE"]
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Session Setup
app.use(session({
    secret: process.env.SESSION_SECRET || 'change_this_secret_in_env_file',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: IS_PRODUCTION, // True on HTTPS, False on Localhost
        httpOnly: true, // Prevents XSS stealing cookies
        maxAge: 24 * 60 * 60 * 1000 // 24 Hours
    }
}));

// =========================================================
// 2. DATABASE CONNECTION
// =========================================================

const pool = mysql.createPool({
    host: process.env.DB_SERVER || '127.0.0.1',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: '+05:30'
});

// --- Helper Functions ---

// Generate Next Paid Invoice Number (e.g., INV-00001)
async function generatePaidInvoiceNumber() {
    try {
        const [rows] = await pool.query("SELECT COUNT(*) as count FROM Invoices WHERE PaidInvoiceNumber IS NOT NULL AND PaidInvoiceNumber != ''");
        const count = rows[0].count;
        return `INV-${(count + 1).toString().padStart(5, '0')}`;
    } catch (e) {
        return `EST-${Date.now()}`;
    }
}

// Convert Date to MySQL format
function toISTMySQL(dateInput = new Date()) {
    const d = new Date(dateInput);
    const ist = new Date(d.getTime() + (5.5 * 60 * 60 * 1000));
    return ist.toISOString().slice(0, 19).replace('T', ' ');
}

// --- Payment Gateway Config ---

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

const ccav = {
    encrypt: function (plainText, workingKey) {
        const m = crypto.createHash('md5');
        m.update(workingKey);
        const key = m.digest();
        const iv = Buffer.from('\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0a\x0b\x0c\x0d\x0e\x0f', 'binary');
        const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
        let encoded = cipher.update(plainText, 'utf8', 'hex');
        encoded += cipher.final('hex');
        return encoded;
    },
    decrypt: function (encText, workingKey) {
        const m = crypto.createHash('md5');
        m.update(workingKey);
        const key = m.digest();
        const iv = Buffer.from('\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0a\x0b\x0c\x0d\x0e\x0f', 'binary');
        const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
        let decoded = decipher.update(encText, 'hex', 'utf8');
        decoded += decipher.final('utf8');
        return decoded;
    }
};

// =========================================================
// SECTION A: PUBLIC ROUTES (NO LOGIN REQUIRED)
// =========================================================

// A1. Login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        // Simple plaintext check (Matches your previous code)
        const [rows] = await pool.query('SELECT ID, Name, Email FROM Users WHERE Email = ? AND Password = ?', [email, password]);

        if (!rows.length) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = rows[0];
        req.session.user = { id: user.ID, name: user.Name, email: user.Email };

        // Force save to ensure cookie is set
        req.session.save(err => {
            if (err) return res.status(500).json({ error: 'Session save failed' });
            res.json({ success: true, user: req.session.user });
        });
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ error: 'Server error' });
    }
});

// A2. Check Auth Status (Called by Frontend App.tsx)
app.get('/api/check-auth', (req, res) => {
    if (req.session.user) {
        res.json({ authenticated: true, user: req.session.user });
    } else {
        res.json({ authenticated: false });
    }
});

// A3. Logout
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ error: 'Logout failed' });
        res.clearCookie('connect.sid'); // Default cookie name
        res.json({ success: true });
    });
});

// A4. View Public Invoice Data
app.get('/api/invoices/:id', async (req, res) => {
    try {
        const [invoices] = await pool.query('SELECT * FROM Invoices WHERE ID = ?', [req.params.id]);
        if (invoices.length === 0) return res.status(404).json({ error: 'Not found' });

        const invoice = invoices[0];
        const [items] = await pool.query('SELECT * FROM LineItems WHERE InvoiceID = ?', [invoice.ID]);
        invoice.items = items;
        res.json(invoice);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// A5. View Public PDF
app.get('/api/invoices/:id/view-pdf', (req, res) => {
    try {
        const { id } = req.params;
        const safeFileName = `PAID-${id.replace(/[^a-z0-9]/gi, '_')}.pdf`;
        const filePath = path.join(process.cwd(), 'uploads', 'invoices', safeFileName);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'PDF not found' });
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename=' + safeFileName);
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// A6. Payment Callbacks (Razorpay / CCAvenue) - MUST BE PUBLIC
app.post('/api/payment/razorpay/create-order', async (req, res) => {
    const { amount, currency, receipt } = req.body;
    try {
        const order = await razorpay.orders.create({
            amount: Math.round(amount * 100),
            currency: currency || 'INR',
            receipt: receipt
        });
        res.json({ ...order, key_id: process.env.RAZORPAY_KEY_ID });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/payment/razorpay/verify', async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, invoice_id } = req.body;
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body.toString()).digest('hex');

    if (expectedSignature === razorpay_signature) {
        const paidInvoiceNumber = await generatePaidInvoiceNumber();
        await pool.query('UPDATE Invoices SET Status = ?, PaymentGateway = ?, PaidInvoiceNumber = ? WHERE ID = ?', ['PAID', 'Razorpay', paidInvoiceNumber, invoice_id]);
        res.json({ status: 'success' });
    } else {
        res.status(400).json({ status: 'failure' });
    }
});

app.post('/api/payment/initiate', (req, res) => {
    const { order_id, amount, currency, billing_name } = req.body;
    const merchantId = process.env.CCAV_MERCHANT_ID;
    const accessCode = process.env.CCAV_ACCESS_CODE;
    const workingKey = process.env.CCAV_WORKING_KEY;
    const ccavUrl = process.env.CCAV_API_URL || 'https://test.ccavenue.com/transaction/transaction.do?command=initiateTransaction';

    if (!merchantId) return res.status(500).send("CCAV Credentials missing");

    const baseUrl = process.env.APP_BASE_URL || `${req.protocol}://${req.get('host')}`;
    const redirectUrl = `${baseUrl}/api/payment/ccavResponseHandler`;
    const cancelUrl = `${baseUrl}/api/payment/ccavResponseHandler`;

    const paramsMap = new URLSearchParams();
    paramsMap.append('merchant_id', merchantId);
    paramsMap.append('order_id', order_id);
    paramsMap.append('currency', currency);
    paramsMap.append('amount', amount);
    paramsMap.append('redirect_url', redirectUrl);
    paramsMap.append('cancel_url', cancelUrl);
    paramsMap.append('billing_name', billing_name);

    const encRequest = ccav.encrypt(paramsMap.toString(), workingKey);
    res.send(`<form id="nonseamless" method="post" name="redirect" action="${ccavUrl}"><input type="hidden" id="encRequest" name="encRequest" value="${encRequest}"><input type="hidden" name="access_code" id="access_code" value="${accessCode}"></form><script>document.redirect.submit();</script>`);
});

app.post('/api/payment/ccavResponseHandler', async (req, res) => {
    const { encResp } = req.body;
    const workingKey = process.env.CCAV_WORKING_KEY;
    let decrypted = '';
    try { decrypted = ccav.decrypt(encResp, workingKey); }
    catch (e) { return res.send("<script>window.close();</script>"); }

    const params = new URLSearchParams(decrypted);
    const orderStatus = params.get('order_status');
    const orderId = params.get('order_id');

    let htmlResponse = '';
    if (orderStatus && orderStatus.toLowerCase() === 'success') {
        const paidInvoiceNumber = await generatePaidInvoiceNumber();
        await pool.query('UPDATE Invoices SET Status = ?, PaymentGateway = ?, PaidInvoiceNumber = ? WHERE ID = ?', ['PAID', 'CCAvenue', paidInvoiceNumber, orderId]);
        htmlResponse = `<script>if(window.opener){window.opener.postMessage('PAYMENT_SUCCESS', '*');} window.close();</script>`;
    } else {
        await pool.query('UPDATE Invoices SET Status = ? WHERE ID = ?', ['FAILED', orderId]);
        htmlResponse = `<script>if(window.opener){window.opener.postMessage('PAYMENT_CANCEL', '*');} window.close();</script>`;
    }
    res.send(htmlResponse);
});

// =========================================================
// =========================================================
// SECTION B: AUTHENTICATION BARRIER
// =========================================================

app.use((req, res, next) => {
    // 1. If this is NOT an API request (e.g. it is /login, /dashboard, or an image), 
    //    skip this check and let the request go to the Frontend code.
    if (!req.path.startsWith('/api')) {
        return next();
    }

    // 2. If it IS an API request, check for Session
    if (req.session && req.session.user) {
        next(); // User is logged in, proceed
    } else {
        // User is NOT logged in
        res.status(401).json({ error: 'Unauthorized: Please login' });
    }
});

// =========================================================
// SECTION C: PRIVATE ROUTES (REQUIRE LOGIN)
// =========================================================

// C1. Dashboard: List Invoices
app.get('/api/invoices', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM Invoices ORDER BY Date DESC');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// C2. Create/Save Invoice
app.post('/api/invoices', async (req, res) => {
    const inv = req.body;
    const connection = await pool.getConnection();

    // Auto-generate PaidInvoiceNumber if Paid
    if (inv.status === 'PAID' && (!inv.paidInvoiceNumber || inv.paidInvoiceNumber === '')) {
        inv.paidInvoiceNumber = await generatePaidInvoiceNumber();
    }

    const sqlDate = toISTMySQL(inv.date);
    const sqlDueDate = toISTMySQL(inv.dueDate);

    try {
        await connection.beginTransaction();
        const query = `
            INSERT INTO Invoices 
            (ID, InvoiceNumber, PaidInvoiceNumber, Type, Date, DueDate, Template, BrandColor, LogoUrl, SellerName, BusinessName, SellerAddress, 
            SellerGstin, SellerEmail, SellerPhone, BuyerName, BuyerContactPerson, BuyerEmail, BuyerPhone, BuyerAddress, BuyerShippingAddress, PlaceOfSupply, BuyerPinCode,
            ResourceSection, ResourceName, Subtotal, TaxRate, TaxAmount, Total, Currency, Status, PaymentGateway, Notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            InvoiceNumber=?, PaidInvoiceNumber=?, Type=?, Date=?, DueDate=?, Template=?, BrandColor=?, LogoUrl=?, SellerName=?, BusinessName=?, SellerAddress=?,
            SellerGstin=?, SellerEmail=?, SellerPhone=?, BuyerName=?, BuyerContactPerson=?, BuyerEmail=?, BuyerPhone=?, BuyerAddress=?, BuyerShippingAddress=?, PlaceOfSupply=?, BuyerPinCode=?,
            ResourceSection=?, ResourceName=?, Subtotal=?, TaxRate=?, TaxAmount=?, Total=?, Currency=?, Status=?, PaymentGateway=?, Notes=?
        `;

        const params = [
            inv.id, inv.invoiceNumber, inv.paidInvoiceNumber, inv.type, sqlDate, sqlDueDate, inv.template, inv.brandColor, inv.logoUrl, inv.sellerName, inv.businessName, inv.sellerAddress,
            inv.sellerGstin, inv.sellerEmail, inv.sellerPhone, inv.buyerName, inv.buyerContactPerson, inv.buyerEmail, inv.buyerPhone, inv.buyerAddress, inv.buyerShippingAddress, inv.placeOfSupply, inv.buyerPinCode,
            inv.resourceSection, inv.resourceName, inv.subtotal, inv.taxRate, inv.taxAmount, inv.total, inv.currency, inv.status, inv.paymentGateway, inv.notes,
            // Update params
            inv.invoiceNumber, inv.paidInvoiceNumber, inv.type, sqlDate, sqlDueDate, inv.template, inv.brandColor, inv.logoUrl, inv.sellerName, inv.businessName, inv.sellerAddress,
            inv.sellerGstin, inv.sellerEmail, inv.sellerPhone, inv.buyerName, inv.buyerContactPerson, inv.buyerEmail, inv.buyerPhone, inv.buyerAddress, inv.buyerShippingAddress, inv.placeOfSupply, inv.buyerPinCode,
            inv.resourceSection, inv.resourceName, inv.subtotal, inv.taxRate, inv.taxAmount, inv.total, inv.currency, inv.status, inv.paymentGateway, inv.notes
        ];

        await connection.query(query, params);

        // Replace Line Items
        await connection.query('DELETE FROM LineItems WHERE InvoiceID = ?', [inv.id]);
        if (inv.items && inv.items.length > 0) {
            const itemValues = inv.items.map((item, index) => [`li_${Date.now()}_${index}`, inv.id, item.name, item.description, item.quantity, item.rate, item.amount]);
            await connection.query('INSERT INTO LineItems (ID, InvoiceID, ItemName, Description, Quantity, Rate, Amount) VALUES ?', [itemValues]);
        }

        await connection.commit();
        res.json({ success: true, id: inv.id, paidInvoiceNumber: inv.paidInvoiceNumber });
    } catch (err) {
        await connection.rollback();
        console.error("Save Invoice Error:", err);
        res.status(500).json({ error: err.message });
    } finally { connection.release(); }
});

app.delete('/api/invoices/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM Invoices WHERE ID = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// C3. Products
app.get('/api/products', async (req, res) => {
    try { const [rows] = await pool.query('SELECT * FROM Products'); res.json(rows); } catch (e) { res.status(500).json(e); }
});
app.post('/api/products', async (req, res) => {
    const { id, name, description, rate } = req.body;
    try { await pool.query('INSERT INTO Products (ID, Name, Description, Rate) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE Name=?, Description=?, Rate=?', [id, name, description, rate, name, description, rate]); res.json({ success: true }); } catch (e) { res.status(500).json(e); }
});
app.delete('/api/products/:id', async (req, res) => {
    try { await pool.query('DELETE FROM Products WHERE ID=?', [req.params.id]); res.json({ success: true }); } catch (e) { res.status(500).json(e); }
});

// C4. Customers
app.get('/api/customers', async (req, res) => {
    try { const [rows] = await pool.query('SELECT * FROM Customers'); res.json(rows); } catch (e) { res.status(500).json(e); }
});
app.post('/api/customers', async (req, res) => {
    const c = req.body;
    try {
        await pool.query('INSERT INTO Customers (ID, Name, ContactPerson, Email, Phone, Address, ShippingAddress, Gstin, PlaceOfSupply, PinCode) VALUES (?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE Name=?, ContactPerson=?, Email=?, Phone=?, Address=?, ShippingAddress=?, Gstin=?, PlaceOfSupply=?, PinCode=?',
            [c.id, c.name, c.contactPerson, c.email, c.phone, c.address, c.shippingAddress, c.gstin, c.placeOfSupply, c.pinCode, c.name, c.contactPerson, c.email, c.phone, c.address, c.shippingAddress, c.gstin, c.placeOfSupply, c.pinCode]);
        res.json({ success: true });
    } catch (e) { res.status(500).json(e); }
});
app.delete('/api/customers/:id', async (req, res) => {
    try { await pool.query('DELETE FROM Customers WHERE ID=?', [req.params.id]); res.json({ success: true }); } catch (e) { res.status(500).json(e); }
});

// C5. Settings
app.get('/api/settings/seller', async (req, res) => {
    try { const [rows] = await pool.query('SELECT * FROM SellerProfile LIMIT 1'); res.json(rows[0] || {}); } catch (e) { res.status(500).json(e); }
});
app.post('/api/settings/seller', async (req, res) => {
    const s = req.body;
    try {
        await pool.query('INSERT INTO SellerProfile (ID, SellerName, BusinessName, SellerAddress, SellerGstin, SellerEmail, SellerPhone, LogoUrl, BrandColor) VALUES (?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE SellerName=?, BusinessName=?, SellerAddress=?, SellerGstin=?, SellerEmail=?, SellerPhone=?, LogoUrl=?, BrandColor=?',
            ['profile_default', s.sellerName, s.businessName, s.sellerAddress, s.sellerGstin, s.sellerEmail, s.sellerPhone, s.logoUrl, s.brandColor, s.sellerName, s.businessName, s.sellerAddress, s.sellerGstin, s.sellerEmail, s.sellerPhone, s.logoUrl, s.brandColor]);
        res.json({ success: true });
    } catch (e) { res.status(500).json(e); }
});

// C6. Save PDF (Server-side storage for sent emails)
app.post('/api/invoices/:id/save-pdf', (req, res) => {
    try {
        const { id } = req.params;
        const { pdfBase64 } = req.body;
        if (!pdfBase64) return res.status(400).json({ message: 'PDF missing' });

        const base64Data = pdfBase64.replace(/^data:application\/pdf;base64,/, "");
        const uploadPath = path.join(process.cwd(), 'uploads', 'invoices');
        if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });

        const safeFileName = `PAID-${id.replace(/[^a-z0-9]/gi, '_')}.pdf`;
        fs.writeFileSync(path.join(uploadPath, safeFileName), base64Data, 'base64');
        res.json({ success: true });
    } catch (err) { res.status(500).json({ message: 'Failed', error: err.message }); }
});

// C7. Email Notification
app.post('/api/notify', async (req, res) => {
    const { to, subject, body, attachments } = req.body;
    if (!process.env.SMTP_USER) return res.json({ success: true, message: "Stub: SMTP missing" });
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT),
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        });
        await transporter.sendMail({ from: process.env.SMTP_USER, to, subject, html: body, attachments });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
// --- YCLOUD WHATSAPP API ---
app.post('/api/whatsapp/send', async (req, res) => {
    let { to, invoiceNumber, link, amount, buyerName, triggerType } = req.body;

    // Safety check for amount
    amount = amount ? Number(amount.toString().replace(/[^0-9.]/g, '')) : 0;

    const apiKey = process.env.YCLOUD_API_KEY;
    const fromNumber = process.env.YCLOUD_FROM_NUMBER;
    const apiUrl = process.env.YCLOUD_API_URL ;

    if (!apiKey) {
        console.warn("⚠️ YCloud API Key missing in .env");
        return res.json({ success: true, message: "Stub: API Key missing" });
    }

    let recipient = to ? to.replace(/[^0-9]/g, '') : '';
    if (recipient.length === 10) recipient = '91' + recipient;
    if (!recipient.startsWith('+')) recipient = '+' + recipient;

    let payload = {};
    if (triggerType === 'PAID') {

        const pdfUrl = `${process.env.APP_BASE_URL}/api/invoices/${invoiceNumber}/view-pdf`;
        console.log("✅ pdf Sent. ID:", pdfUrl);
        console.log("✅Number. ID:", invoiceNumber);
        payload = {
            from: fromNumber,
            to: recipient,
            type: "template",
            template: {
                name: "payment_rcv_inv",
                language: { code: "en", policy: "deterministic" },
                components: [
                    { type: "header", parameters: [{ type: "document", document: { link: pdfUrl, filename: "Invoice_from_Wappie.pdf" } }] },
                    { type: "body", parameters: [{ type: "text", text: buyerName || "Customer" }, { type: "text", text: amount.toString() }, { type: "text", text: invoiceNumber }] }
                ]
            }
        };
    } else {
        payload = {
            from: fromNumber,
            to: recipient,
            type: "template",
            template: {
                name: "inv_quote_status",
                language: { code: "en", "policy": "deterministic" },
                components: [
                    { type: "body", parameters: [{ type: "text", text: buyerName || "Customer" }, { type: "text", text: invoiceNumber }, { type: "text", text: amount.toString() }, { type: "text", text: link }] }
                ]
            }
        };
    }

    try {
        console.log(`\n📱 Sending WhatsApp (${triggerType || 'CREATED'}) to ${recipient}...`);
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!response.ok) {
            console.error("❌ YCloud Error:", JSON.stringify(data));
            return res.status(response.status).json(data);
        }
        console.log("✅ WhatsApp Sent. ID:", data.id);

        res.json(data);
    } catch (error) {
        console.error("❌ YCloud Network Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// =========================================================
// 4. SERVE FRONTEND (SAME DOMAIN HOSTING)
// =========================================================

// Serve static React files
app.use(express.static(path.join(__dirname, 'dist')));

// Handle client-side routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${IS_PRODUCTION ? 'Production' : 'Development'}`);
});