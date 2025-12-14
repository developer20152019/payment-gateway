/**
 * UNIFIED SERVER (Node.js / Express)
 * 
 * Features:
 * 1. Secure SQL Server Persistence (CRUD for Invoices & Products)
 * 2. CCAvenue Payment Integration (AES-128-CBC)
 * 3. Razorpay Payment Integration
 * 4. Email Notifications (Nodemailer)
 * 5. Gemini AI Integration (Text Generation)
 */

// Load environment variables from .env file
require('dotenv').config();

// --- DEPENDENCY CHECK ---
let express, cors, sql, bodyParser, qs, Razorpay, crypto, nodemailer, GoogleGenAI;

try {
    express = require('express');
    cors = require('cors');
    sql = require('mssql');
    bodyParser = require('body-parser');
    qs = require('querystring');
    crypto = require('crypto');
    
    // Dynamic import for Gemini SDK (ESM)
    (async () => {
        try {
            const genaiModule = await import("@google/genai");
            GoogleGenAI = genaiModule.GoogleGenAI;
            console.log("✨ GoogleGenAI SDK loaded");
        } catch (e) {
            console.warn("\x1b[33m%s\x1b[0m", "⚠️  '@google/genai' not found. AI features disabled.");
        }
    })();

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
        process.exit(1);
    } else {
        throw e;
    }
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

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

// ==========================================
// AI ENDPOINT
// ==========================================
app.post('/api/ai/generate', async (req, res) => {
    if (!GoogleGenAI) return res.status(503).json({ error: "AI SDK not initialized on server." });
    if (!process.env.API_KEY) return res.status(500).json({ error: "Server API_KEY not configured." });

    const { prompt, systemInstruction } = req.body;

    try {
        // Initialize AI client with key from process.env
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // Use gemini-2.5-flash for fast text tasks
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: systemInstruction || "You are a helpful assistant.",
                temperature: 0.7
            }
        });
        
        res.json({ text: response.text });
    } catch (e) {
        console.error("GenAI Error:", e);
        res.status(500).json({ error: "AI Generation Failed: " + e.message });
    }
});

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
    if (sql.connected && orderStatus === 'Success') {
        try { 
            await sql.query`UPDATE Invoices SET Status = 'PAID', PaymentGateway = 'CCAvenue' WHERE ID = ${orderId}`; 
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
        if (sql.connected && invoice_id) {
            try { 
                await sql.query`UPDATE Invoices SET Status = 'PAID', PaymentGateway = 'Razorpay' WHERE ID = ${invoice_id}`; 
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
    const { to, subject, body, link, type } = req.body;
    
    console.log(`\n📨 [EMAIL] To: ${to} | Subject: ${subject}`);

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
                        <a href="${link}" style="display: inline-block; background: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Document</a>
                       </div>`
            });
        } catch(e) {
            console.error("Email send failed:", e.message);
        }
    }

    res.json({ message: "Notification processed" });
});

// ==========================================
// SQL DATABASE ENDPOINTS
// ==========================================

const sqlConfig = {
    database: 'PayLinkDB',
    server: '(localdb)\\MSSQLLocalDB', 
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
    options: { encrypt: true, trustServerCertificate: true }
};

sql.connect(sqlConfig).then(() => {
    console.log("✅ Connected to SQL Server");
}).catch(err => {
    console.log("⚠️ SQL Server Connection Failed. Running in Offline Mode.");
});

// --- HELPER MAPPERS ---
const mapToInvoice = (record, items = []) => ({
    id: record.ID,
    invoiceNumber: record.InvoiceNumber,
    type: record.Type || 'INVOICE',
    date: record.Date ? record.Date.toISOString().split('T')[0] : '',
    dueDate: record.DueDate ? record.DueDate.toISOString().split('T')[0] : '',
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
    buyerEmail: record.BuyerEmail,
    buyerPhone: record.BuyerPhone,
    buyerAddress: record.BuyerAddress,
    resourceSection: record.ResourceSection,
    resourceName: record.ResourceName,
    subtotal: record.Subtotal,
    taxRate: record.TaxRate,
    taxAmount: record.TaxAmount,
    total: record.Total,
    currency: record.Currency,
    status: record.Status || 'PENDING',
    paymentGateway: record.PaymentGateway || '',
    notes: record.Notes,
    items: items
});

// --- INVOICE ENDPOINTS ---

app.get('/api/invoices', async (req, res) => {
    if (!sql.connected) return res.status(503).json({ error: "Database unavailable" });
    try {
        const result = await sql.query`SELECT * FROM Invoices ORDER BY Date DESC`;
        const invoices = result.recordset.map(r => mapToInvoice(r, []));
        res.json(invoices);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/invoices/:id', async (req, res) => {
    if (!sql.connected) return res.status(503).json({ error: "Database unavailable" });
    try {
        const result = await sql.query`SELECT * FROM Invoices WHERE ID = ${req.params.id}`;
        if (result.recordset.length === 0) return res.status(404).json({ message: "Not Found" });
        const invoiceRecord = result.recordset[0];
        
        const itemsResult = await sql.query`SELECT * FROM LineItems WHERE InvoiceID = ${req.params.id}`;
        const items = itemsResult.recordset.map(i => ({ 
            id: i.ID, 
            name: i.ItemName || '',
            description: i.Description, 
            quantity: i.Quantity, 
            rate: i.Rate, 
            amount: i.Amount 
        }));
        
        res.json(mapToInvoice(invoiceRecord, items));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/invoices', async (req, res) => {
    if (!sql.connected) return res.status(503).json({ error: "Database unavailable" });
    const invoice = req.body;
    const transaction = new sql.Transaction();
    try {
        await transaction.begin();
        const request = new sql.Request(transaction);
        
        // Bind Inputs
        request.input('id', sql.NVarChar, invoice.id);
        request.input('invNum', sql.NVarChar, invoice.invoiceNumber);
        request.input('type', sql.NVarChar, invoice.type || 'INVOICE');
        request.input('date', sql.Date, invoice.date);
        request.input('dueDate', sql.Date, invoice.dueDate);
        request.input('template', sql.NVarChar, invoice.template);
        request.input('brandColor', sql.NVarChar, invoice.brandColor);
        request.input('logoUrl', sql.NVarChar, invoice.logoUrl || '');
        request.input('sName', sql.NVarChar, invoice.sellerName);
        request.input('bName', sql.NVarChar, invoice.businessName);
        request.input('sAddr', sql.NVarChar, invoice.sellerAddress);
        request.input('sGstin', sql.NVarChar, invoice.sellerGstin || '');
        request.input('sEmail', sql.NVarChar, invoice.sellerEmail);
        request.input('sPhone', sql.NVarChar, invoice.sellerPhone);
        request.input('buyName', sql.NVarChar, invoice.buyerName);
        request.input('buyEmail', sql.NVarChar, invoice.buyerEmail);
        request.input('buyPhone', sql.NVarChar, invoice.buyerPhone);
        request.input('buyAddr', sql.NVarChar, invoice.buyerAddress);
        request.input('resSec', sql.NVarChar, invoice.resourceSection || '');
        request.input('resName', sql.NVarChar, invoice.resourceName || '');
        request.input('sub', sql.Decimal(18,2), invoice.subtotal || 0);
        request.input('taxRate', sql.Decimal(5,2), invoice.taxRate || 0);
        request.input('taxAmt', sql.Decimal(18,2), invoice.taxAmount || 0);
        request.input('total', sql.Decimal(18,2), invoice.total || 0);
        request.input('curr', sql.NVarChar, invoice.currency);
        request.input('status', sql.NVarChar, invoice.status || 'PENDING');
        request.input('pg', sql.NVarChar, invoice.paymentGateway || '');
        request.input('notes', sql.NVarChar, invoice.notes || '');

        const check = await request.query(`SELECT ID FROM Invoices WHERE ID = @id`);
        
        if (check.recordset.length > 0) {
            // Update
            await request.query(`
                UPDATE Invoices SET 
                InvoiceNumber=@invNum, Type=@type, Date=@date, DueDate=@dueDate, Template=@template, BrandColor=@brandColor, LogoUrl=@logoUrl,
                SellerName=@sName, BusinessName=@bName, SellerAddress=@sAddr, SellerGstin=@sGstin, SellerEmail=@sEmail, SellerPhone=@sPhone,
                BuyerName=@buyName, BuyerEmail=@buyEmail, BuyerPhone=@buyPhone, BuyerAddress=@buyAddr, ResourceSection=@resSec, ResourceName=@resName,
                Subtotal=@sub, TaxRate=@taxRate, TaxAmount=@taxAmt, Total=@total, Currency=@curr, Status=@status, PaymentGateway=@pg, Notes=@notes
                WHERE ID = @id
            `);
        } else {
            // Insert
            await request.query(`
                INSERT INTO Invoices 
                (ID, InvoiceNumber, Type, Date, DueDate, Template, BrandColor, LogoUrl, SellerName, BusinessName, SellerAddress, 
                SellerGstin, SellerEmail, SellerPhone, BuyerName, BuyerEmail, BuyerPhone, BuyerAddress, ResourceSection, ResourceName, Subtotal, 
                TaxRate, TaxAmount, Total, Currency, Status, PaymentGateway, Notes)
                VALUES 
                (@id, @invNum, @type, @date, @dueDate, @template, @brandColor, @logoUrl, @sName, @bName, @sAddr, 
                @sGstin, @sEmail, @sPhone, @buyName, @buyEmail, @buyPhone, @buyAddr, @resSec, @resName, @sub, 
                @taxRate, @taxAmt, @total, @curr, @status, @pg, @notes)
            `);
        }

        // Line Items
        await request.query(`DELETE FROM LineItems WHERE InvoiceID = @id`);
        for (const item of invoice.items) {
            const itemReq = new sql.Request(transaction);
            itemReq.input('i_id', sql.NVarChar, item.id);
            itemReq.input('inv_id', sql.NVarChar, invoice.id);
            itemReq.input('name', sql.NVarChar, item.name || ''); 
            itemReq.input('desc', sql.NVarChar, item.description);
            // Ensure numeric defaults to prevent SQL errors on empty strings
            itemReq.input('qty', sql.Decimal(18,2), item.quantity || 0); 
            itemReq.input('rate', sql.Decimal(18,2), item.rate || 0);
            itemReq.input('amt', sql.Decimal(18,2), item.amount || 0);
            
            await itemReq.query(`INSERT INTO LineItems (ID, InvoiceID, ItemName, Description, Quantity, Rate, Amount) VALUES (@i_id, @inv_id, @name, @desc, @qty, @rate, @amt)`);
        }
        
        await transaction.commit();
        res.status(200).json({ message: "Saved successfully" });
    } catch (err) {
        if (transaction._aborted === false) await transaction.rollback();
        console.error("SQL Error during Save:", err);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/invoices/:id', async (req, res) => {
    if (!sql.connected) return res.status(503).json({ error: "Database unavailable" });
    const transaction = new sql.Transaction();
    try {
        await transaction.begin();
        const request = new sql.Request(transaction);
        request.input('id', sql.NVarChar, req.params.id);
        await request.query(`DELETE FROM LineItems WHERE InvoiceID = @id`);
        await request.query(`DELETE FROM Invoices WHERE ID = @id`);
        await transaction.commit();
        res.status(200).json({ message: "Deleted successfully" });
    } catch (err) {
        if (transaction._aborted === false) await transaction.rollback();
        res.status(500).json({ error: err.message });
    }
});

// ... [PRODUCT ENDPOINTS] ...
app.get('/api/products', async (req, res) => {
    if (!sql.connected) return res.status(503).json({ error: "Database unavailable" });
    try {
        const result = await sql.query`SELECT * FROM Products ORDER BY Name ASC`;
        const products = result.recordset.map(r => ({
            id: r.ID, name: r.Name, description: r.Description, rate: r.Rate
        }));
        res.json(products);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/products', async (req, res) => {
    if (!sql.connected) return res.status(503).json({ error: "Database unavailable" });
    const { id, name, description, rate } = req.body;
    try {
        const request = new sql.Request();
        request.input('id', sql.NVarChar, id);
        request.input('name', sql.NVarChar, name);
        request.input('desc', sql.NVarChar, description);
        request.input('rate', sql.Decimal(18,2), rate);
        
        await request.query(`
            MERGE Products AS target
            USING (SELECT @id AS ID) AS source
            ON (target.ID = source.ID)
            WHEN MATCHED THEN
                UPDATE SET Name = @name, Description = @desc, Rate = @rate
            WHEN NOT MATCHED THEN
                INSERT (ID, Name, Description, Rate) VALUES (@id, @name, @desc, @rate);
        `);
        res.status(200).json({ message: "Product saved" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/products/:id', async (req, res) => {
    if (!sql.connected) return res.status(503).json({ error: "Database unavailable" });
    try {
        const request = new sql.Request();
        request.input('id', sql.NVarChar, req.params.id);
        await request.query(`DELETE FROM Products WHERE ID = @id`);
        res.status(200).json({ message: "Product deleted" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(PORT, () => {
    console.log(`Unified Server running at http://localhost:${PORT}`);
    console.log("Environment: " + (process.env.NODE_ENV || 'development'));
});
