/**
 * UNIFIED SERVER (Node.js / Express)
 * 
 * Features:
 * 1. Secure MySQL Database Persistence (CRUD for Invoices & Products)
 * 2. CCAvenue Payment Integration (AES-128-CBC)
 * 3. Razorpay Payment Integration
 * 4. Email Notifications (Nodemailer)
 */

// Load environment variables from .env file
try {
    require('dotenv').config();
} catch (e) {
    console.warn("\x1b[33m%s\x1b[0m", "⚠️  'dotenv' module not found. Environment variables must be set manually.");
}

// --- DEPENDENCY CHECK ---
let express, cors, mysql, bodyParser, qs, Razorpay, crypto, nodemailer;

try {
    express = require('express');
    cors = require('cors');
    mysql = require('mysql2/promise');
    bodyParser = require('body-parser');
    qs = require('querystring');
    crypto = require('crypto');
    
    try {
        Razorpay = require('razorpay');
    } catch (e) {
        console.warn("\x1b[33m%s\x1b[0m", "⚠️  'razorpay' module not found. Razorpay features will be disabled.");
    }

    try {
        nodemailer = require('nodemailer');
    } catch (e) {
        console.warn("\x1b[33m%s\x1b[0m", "⚠️  'nodemailer' not found. Email features will simulate logging only.");
    }

} catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') {
        console.error('\n\x1b[31m%s\x1b[0m', '======================================================');
        console.error('\x1b[31m%s\x1b[0m', ' [ERROR] Missing Backend Dependencies');
        console.error('\x1b[33m%s\x1b[0m', ' Please run: npm install');
        console.error('\x1b[31m%s\x1b[0m', '======================================================');
        process.exit(1);
    } else {
        throw e;
    }
}

const app = express();
const PORT = process.env.PORT || 3000;

// Enable All CORS Requests for development convenience
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Increased limit to 50mb to handle large PDF attachments via Email
app.use(bodyParser.json({ limit: '50mb' })); 
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// --- SECURITY CONFIGURATION ---
// Credentials are now read exclusively from process.env (loaded via .env file)
const ccavenueConfig = {
    workingKey: process.env.CCAV_WORKING_KEY || '', 
    merchantId: process.env.CCAV_MERCHANT_ID || '',
    accessCode: process.env.CCAV_ACCESS_CODE || '',
};

const razorpayConfig = {
    key_id: process.env.RAZORPAY_KEY_ID || '',
    key_secret: process.env.RAZORPAY_KEY_SECRET || ''
};

// Check for missing keys on startup
if (!ccavenueConfig.workingKey && !razorpayConfig.key_id) {
    console.warn("\x1b[33m%s\x1b[0m", "⚠️  Payment Gateway Keys missing in .env file. Payments will fail or run in simulation mode.");
}

// --- EMAIL CONFIGURATION ---
const emailTransporter = (nodemailer && process.env.SMTP_HOST) ? nodemailer.createTransport({
    host: process.env.SMTP_HOST, 
    port: 587,
    secure: false, 
    auth: {
        user: process.env.SMTP_USER, 
        pass: process.env.SMTP_PASS
    }
}) : null;

// --- CCAVENUE CRYPTO UTILS (AES-128-CBC) ---
const ccav = {
    encrypt: function (plainText, workingKey) {
        try {
            const m = crypto.createHash('md5');
            m.update(workingKey);
            const key = m.digest(); 
            const iv = Buffer.from('\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0a\x0b\x0c\x0d\x0e\x0f', 'binary');	
            const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
            let encoded = cipher.update(plainText,'utf8','hex');
            encoded += cipher.final('hex');
            return encoded;
        } catch (e) {
            console.error("Encryption Error:", e.message);
            return null;
        }
    },
    decrypt: function (encText, workingKey) {
        try {
            const m = crypto.createHash('md5');
            m.update(workingKey);
            const key = m.digest();
            const iv = Buffer.from('\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0a\x0b\x0c\x0d\x0e\x0f', 'binary');	
            const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
            let decoded = decipher.update(encText,'hex','utf8');
            decoded += decipher.final('utf8');
            return decoded;
        } catch (e) {
            console.error("Decryption Error:", e.message);
            return null;
        }
    }
};

// ... [PAYMENT ENDPOINTS] ...
app.post('/api/payment/initiate', (req, res) => {
    const { order_id, amount, currency, billing_name, billing_address, email, billing_tel } = req.body;
    
    // Check if configuration exists
    if (!ccavenueConfig.workingKey || !ccavenueConfig.merchantId) {
        return res.status(500).send("Server Error: CCAvenue credentials not configured in .env file.");
    }

    const params = {
        merchant_id: ccavenueConfig.merchantId,
        order_id: order_id,
        currency: currency,
        amount: amount,
        redirect_url: `http://localhost:${PORT}/api/payment/callback`,
        cancel_url: `http://localhost:${PORT}/api/payment/callback`,
        language: 'EN',
        billing_name: billing_name,
        billing_address: billing_address,
        billing_email: email,
        billing_tel: billing_tel,
    };
    
    const bodyData = qs.stringify(params);
    const encRequest = ccav.encrypt(bodyData, ccavenueConfig.workingKey);
    
    if (!encRequest) return res.status(500).send("Encryption failed");

    const formBody = `<html><head><title>Redirecting...</title><script>window.onload=function(){document.forms['redirect'].submit();};</script></head><body><form id="nonseamless" method="post" name="redirect" action="https://test.ccavenue.com/transaction/transaction.do?command=initiateTransaction"><input type="hidden" id="encRequest" name="encRequest" value="${encRequest}"><input type="hidden" name="access_code" id="access_code" value="${ccavenueConfig.accessCode}"></form></body></html>`;
    res.setHeader('Content-Type', 'text/html');
    res.send(formBody);
});

app.post('/api/payment/callback', async (req, res) => {
    const encResp = req.body.encResp;
    if (!encResp) return res.status(400).send("No response data");

    const decodedStr = ccav.decrypt(encResp, ccavenueConfig.workingKey);
    if (!decodedStr) return res.status(500).send("Decryption failed");

    const data = qs.parse(decodedStr);
    const orderId = data.order_id;
    const orderStatus = data.order_status;

    console.log(`CCAvenue Callback: Order ${orderId} is ${orderStatus}`);

    // Update DB if successful
    if (pool && orderStatus === 'Success') {
        try { 
            await pool.execute('UPDATE Invoices SET Status = ?, PaymentGateway = ? WHERE ID = ?', ['PAID', 'CCAvenue', orderId]); 
        } catch (dbErr) {
            console.error("DB Update Failed:", dbErr);
        }
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    // Communicate with Parent Window (if iframe/popup)
    res.send(`
        <html>
        <body>
            <p>Payment processed. Redirecting...</p>
            <script>
                // Notify parent window if exists
                if (window.opener) {
                    window.opener.postMessage('${orderStatus === 'Success' ? 'PAYMENT_SUCCESS' : 'PAYMENT_CANCEL'}', '*');
                    window.close();
                } else {
                    window.location.href = '${frontendUrl}/#/view/${orderId}';
                }
            </script>
        </body>
        </html>
    `);
});

app.post('/api/payment/razorpay/create-order', async (req, res) => {
    if (!razorpayConfig.key_id) return res.status(500).json({ error: "Razorpay keys missing" });
    
    const razorpayInstance = new Razorpay({
        key_id: razorpayConfig.key_id,
        key_secret: razorpayConfig.key_secret
    });

    const { amount, currency, receipt } = req.body;
    try {
        const order = await razorpayInstance.orders.create({
            amount: Math.round(amount * 100),
            currency: currency,
            receipt: receipt,
            payment_capture: 1
        });
        res.json({ id: order.id, currency: order.currency, amount: order.amount, key_id: razorpayConfig.key_id });
    } catch (error) {
        console.error("Razorpay Error:", error);
        res.status(500).json({ error: "Failed to create order" });
    }
});

app.post('/api/payment/razorpay/verify', async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, invoice_id } = req.body;
    
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
        .createHmac("sha256", razorpayConfig.key_secret)
        .update(body.toString())
        .digest("hex");

    if (expectedSignature === razorpay_signature) {
        if (pool && invoice_id) {
            try { 
                await pool.execute('UPDATE Invoices SET Status = ?, PaymentGateway = ? WHERE ID = ?', ['PAID', 'Razorpay', invoice_id]); 
            } catch (dbErr) {}
        }
        res.json({ status: "success" });
    } else {
        res.status(400).json({ status: "failure" });
    }
});

// ==========================================
// EMAIL NOTIFICATION ENDPOINT
// ==========================================
app.post('/api/notify', async (req, res) => {
    const { to, subject, body, link, type, attachments } = req.body;
    
    console.log(`\n📨 [EMAIL] To: ${to} | Subject: ${subject}`);
    if(attachments) console.log(`   📎 Attachments: ${attachments.length}`);

    if (emailTransporter) {
        try {
            await emailTransporter.sendMail({
                from: '"PayLink System" <no-reply@paylink.com>',
                to,
                subject,
                text: `${body}\n\nLink: ${link}`,
                html: `<div style="font-family: sans-serif; padding: 20px;">
                        <h2>${subject}</h2>
                        <p>${body}</p>
                        <br/>
                        <a href="${link}" style="display: inline-block; background: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Online</a>
                       </div>`,
                attachments: attachments
            });
        } catch(e) {
            console.error("Email send failed:", e.message);
            return res.status(500).json({ error: e.message });
        }
    } else {
        console.warn("   ⚠️  SMTP not configured. Email suppressed.");
    }

    res.json({ message: "Notification processed" });
});

// ==========================================
// MYSQL DATABASE CONFIG
// ==========================================

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

let pool;

try {
    pool = mysql.createPool(dbConfig);
    console.log("✅ MySQL Pool Created");
} catch (err) {
    console.log("⚠️ MySQL Connection Failed:", err.message);
}

// --- HELPER MAPPERS ---
const mapToInvoice = (record, items = []) => {
    return {
        id: record.ID,
        invoiceNumber: record.InvoiceNumber,
        type: record.Type || 'INVOICE',
        date: record.Date instanceof Date ? record.Date.toISOString().split('T')[0] : record.Date,
        dueDate: record.DueDate instanceof Date ? record.DueDate.toISOString().split('T')[0] : record.DueDate,
        template: record.Template,
        brandColor: record.BrandColor,
        logoUrl: record.LogoUrl,
        sellerName: record.SellerName,
        businessName: record.BusinessName,
        sellerAddress: record.SellerAddress,
        sellerGstin: record.SellerGstin,
        sellerEmail: record.SellerEmail,
        sellerPhone: record.SellerPhone,
        buyerName: record.BuyerName,
        buyerContactPerson: record.BuyerContactPerson,
        buyerEmail: record.BuyerEmail,
        buyerPhone: record.BuyerPhone,
        buyerAddress: record.BuyerAddress,
        buyerShippingAddress: record.BuyerShippingAddress,
        placeOfSupply: record.PlaceOfSupply,
        buyerPinCode: record.BuyerPinCode,
        resourceSection: record.ResourceSection,
        resourceName: record.ResourceName,
        subtotal: parseFloat(record.Subtotal),
        taxRate: parseFloat(record.TaxRate),
        taxAmount: parseFloat(record.TaxAmount),
        total: parseFloat(record.Total),
        currency: record.Currency,
        status: record.Status || 'PENDING',
        paymentGateway: record.PaymentGateway || '',
        notes: record.Notes,
        items: items
    };
};

// --- SETTINGS ENDPOINTS ---
app.get('/api/settings/seller', async (req, res) => {
    if (!pool) return res.status(503).json({ error: "Database unavailable" });
    try {
        const [rows] = await pool.execute('SELECT * FROM SellerProfile WHERE ID = ?', ['default']);
        if (rows.length === 0) return res.json({});
        const r = rows[0];
        res.json({
            sellerName: r.SellerName,
            businessName: r.BusinessName,
            sellerAddress: r.SellerAddress,
            sellerGstin: r.SellerGstin,
            sellerEmail: r.SellerEmail,
            sellerPhone: r.SellerPhone,
            logoUrl: r.LogoUrl,
            brandColor: r.BrandColor
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/settings/seller', async (req, res) => {
    if (!pool) return res.status(503).json({ error: "Database unavailable" });
    const s = req.body;
    try {
        // UPSERT for MySQL
        const query = `
            INSERT INTO SellerProfile 
            (ID, SellerName, BusinessName, SellerAddress, SellerGstin, SellerEmail, SellerPhone, LogoUrl, BrandColor)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            SellerName=VALUES(SellerName), BusinessName=VALUES(BusinessName), SellerAddress=VALUES(SellerAddress),
            SellerGstin=VALUES(SellerGstin), SellerEmail=VALUES(SellerEmail), SellerPhone=VALUES(SellerPhone),
            LogoUrl=VALUES(LogoUrl), BrandColor=VALUES(BrandColor)
        `;
        await pool.execute(query, [
            'default', s.sellerName, s.businessName, s.sellerAddress, s.sellerGstin, 
            s.sellerEmail, s.sellerPhone, s.logoUrl, s.brandColor || '#4f46e5'
        ]);
        res.status(200).json({ message: "Settings saved" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- INVOICE ENDPOINTS ---

app.get('/api/invoices', async (req, res) => {
    if (!pool) return res.status(503).json({ error: "Database unavailable" });
    try {
        const [rows] = await pool.execute('SELECT * FROM Invoices ORDER BY Date DESC');
        const invoices = rows.map(r => mapToInvoice(r, []));
        res.json(invoices);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/invoices/:id', async (req, res) => {
    if (!pool) return res.status(503).json({ error: "Database unavailable" });
    try {
        const [invRows] = await pool.execute('SELECT * FROM Invoices WHERE ID = ?', [req.params.id]);
        if (invRows.length === 0) return res.status(404).json({ message: "Not Found" });
        const invoiceRecord = invRows[0];
        
        const [itemRows] = await pool.execute('SELECT * FROM LineItems WHERE InvoiceID = ?', [req.params.id]);
        const items = itemRows.map(i => ({ 
            id: i.ID, 
            name: i.ItemName || '',
            description: i.Description, 
            quantity: parseFloat(i.Quantity), 
            rate: parseFloat(i.Rate), 
            amount: parseFloat(i.Amount) 
        }));
        
        res.json(mapToInvoice(invoiceRecord, items));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/invoices', async (req, res) => {
    if (!pool) return res.status(503).json({ error: "Database unavailable" });
    const invoice = req.body;
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Check exist
        const [check] = await connection.execute('SELECT ID FROM Invoices WHERE ID = ?', [invoice.id]);
        
        if (check.length > 0) {
            // Update
            await connection.execute(`
                UPDATE Invoices SET 
                InvoiceNumber=?, Type=?, Date=?, DueDate=?, Template=?, BrandColor=?, LogoUrl=?,
                SellerName=?, BusinessName=?, SellerAddress=?, SellerGstin=?, SellerEmail=?, SellerPhone=?,
                BuyerName=?, BuyerContactPerson=?, BuyerEmail=?, BuyerPhone=?, BuyerAddress=?, BuyerShippingAddress=?, PlaceOfSupply=?, BuyerPinCode=?,
                ResourceSection=?, ResourceName=?,
                Subtotal=?, TaxRate=?, TaxAmount=?, Total=?, Currency=?, Status=?, PaymentGateway=?, Notes=?
                WHERE ID=?
            `, [
                invoice.invoiceNumber, invoice.type || 'INVOICE', invoice.date, invoice.dueDate, invoice.template, invoice.brandColor, invoice.logoUrl || '',
                invoice.sellerName, invoice.businessName, invoice.sellerAddress, invoice.sellerGstin || '', invoice.sellerEmail, invoice.sellerPhone,
                invoice.buyerName, invoice.buyerContactPerson || '', invoice.buyerEmail, invoice.buyerPhone, invoice.buyerAddress, invoice.buyerShippingAddress || '', invoice.placeOfSupply || '', invoice.buyerPinCode || '',
                invoice.resourceSection || '', invoice.resourceName || '',
                invoice.subtotal || 0, invoice.taxRate || 0, invoice.taxAmount || 0, invoice.total || 0, invoice.currency, invoice.status || 'PENDING', invoice.paymentGateway || '', invoice.notes || '',
                invoice.id
            ]);
        } else {
            // Insert
            await connection.execute(`
                INSERT INTO Invoices 
                (ID, InvoiceNumber, Type, Date, DueDate, Template, BrandColor, LogoUrl, SellerName, BusinessName, SellerAddress, 
                SellerGstin, SellerEmail, SellerPhone, BuyerName, BuyerContactPerson, BuyerEmail, BuyerPhone, BuyerAddress, BuyerShippingAddress, PlaceOfSupply, BuyerPinCode,
                ResourceSection, ResourceName, Subtotal, TaxRate, TaxAmount, Total, Currency, Status, PaymentGateway, Notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                invoice.id, invoice.invoiceNumber, invoice.type || 'INVOICE', invoice.date, invoice.dueDate, invoice.template, invoice.brandColor, invoice.logoUrl || '',
                invoice.sellerName, invoice.businessName, invoice.sellerAddress, invoice.sellerGstin || '', invoice.sellerEmail, invoice.sellerPhone,
                invoice.buyerName, invoice.buyerContactPerson || '', invoice.buyerEmail, invoice.buyerPhone, invoice.buyerAddress, invoice.buyerShippingAddress || '', invoice.placeOfSupply || '', invoice.buyerPinCode || '',
                invoice.resourceSection || '', invoice.resourceName || '',
                invoice.subtotal || 0, invoice.taxRate || 0, invoice.taxAmount || 0, invoice.total || 0, invoice.currency, invoice.status || 'PENDING', invoice.paymentGateway || '', invoice.notes || ''
            ]);
        }

        // Line Items
        await connection.execute('DELETE FROM LineItems WHERE InvoiceID = ?', [invoice.id]);
        
        for (const item of invoice.items) {
            await connection.execute(`
                INSERT INTO LineItems (ID, InvoiceID, ItemName, Description, Quantity, Rate, Amount) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                item.id, invoice.id, item.name || '', item.description, item.quantity || 0, item.rate || 0, item.amount || 0
            ]);
        }
        
        await connection.commit();
        res.status(200).json({ message: "Saved successfully" });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error("SQL Error during Save:", err);
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) connection.release();
    }
});

app.delete('/api/invoices/:id', async (req, res) => {
    if (!pool) return res.status(503).json({ error: "Database unavailable" });
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        await connection.execute('DELETE FROM LineItems WHERE InvoiceID = ?', [req.params.id]);
        await connection.execute('DELETE FROM Invoices WHERE ID = ?', [req.params.id]);
        await connection.commit();
        res.status(200).json({ message: "Deleted successfully" });
    } catch (err) {
        if (connection) await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) connection.release();
    }
});

// ... [PRODUCT ENDPOINTS] ...
app.get('/api/products', async (req, res) => {
    if (!pool) return res.status(503).json({ error: "Database unavailable" });
    try {
        const [rows] = await pool.execute('SELECT * FROM Products ORDER BY Name ASC');
        const products = rows.map(r => ({
            id: r.ID, name: r.Name, description: r.Description, rate: parseFloat(r.Rate)
        }));
        res.json(products);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/products', async (req, res) => {
    if (!pool) return res.status(503).json({ error: "Database unavailable" });
    const { id, name, description, rate } = req.body;
    try {
        await pool.execute(`
            INSERT INTO Products (ID, Name, Description, Rate) VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE Name=VALUES(Name), Description=VALUES(Description), Rate=VALUES(Rate)
        `, [id, name, description, rate]);
        res.status(200).json({ message: "Product saved" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/products/:id', async (req, res) => {
    if (!pool) return res.status(503).json({ error: "Database unavailable" });
    try {
        await pool.execute('DELETE FROM Products WHERE ID = ?', [req.params.id]);
        res.status(200).json({ message: "Product deleted" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ... [CUSTOMER ENDPOINTS] ...
app.get('/api/customers', async (req, res) => {
    if (!pool) return res.status(503).json({ error: "Database unavailable" });
    try {
        const [rows] = await pool.execute('SELECT * FROM Customers ORDER BY Name ASC');
        const customers = rows.map(r => ({
            id: r.ID, 
            name: r.Name, 
            contactPerson: r.ContactPerson,
            email: r.Email, 
            phone: r.Phone,
            address: r.Address,
            shippingAddress: r.ShippingAddress,
            gstin: r.Gstin,
            placeOfSupply: r.PlaceOfSupply,
            pinCode: r.PinCode
        }));
        res.json(customers);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/customers', async (req, res) => {
    if (!pool) return res.status(503).json({ error: "Database unavailable" });
    const { id, name, contactPerson, email, phone, address, shippingAddress, gstin, placeOfSupply, pinCode } = req.body;
    try {
        await pool.execute(`
            INSERT INTO Customers (ID, Name, ContactPerson, Email, Phone, Address, ShippingAddress, Gstin, PlaceOfSupply, PinCode) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
            Name=VALUES(Name), ContactPerson=VALUES(ContactPerson), Email=VALUES(Email), Phone=VALUES(Phone), Address=VALUES(Address), ShippingAddress=VALUES(ShippingAddress),
            Gstin=VALUES(Gstin), PlaceOfSupply=VALUES(PlaceOfSupply), PinCode=VALUES(PinCode)
        `, [id, name, contactPerson || '', email || '', phone || '', address || '', shippingAddress || '', gstin || '', placeOfSupply || '', pinCode || '']);
        res.status(200).json({ message: "Customer saved" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/customers/:id', async (req, res) => {
    if (!pool) return res.status(503).json({ error: "Database unavailable" });
    try {
        await pool.execute('DELETE FROM Customers WHERE ID = ?', [req.params.id]);
        res.status(200).json({ message: "Customer deleted" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(PORT, () => {
    console.log(`Unified Server running at http://localhost:${PORT}`);
    console.log("Environment: " + (process.env.NODE_ENV || 'development'));
});