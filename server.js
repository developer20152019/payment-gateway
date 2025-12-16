require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mysql = require('mysql2/promise');
const crypto = require('crypto');
const Razorpay = require('razorpay');

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
        console.log('   Ensure MySQL is running and .env is configured correctly.');
    }
})();

// --- Helper: Generate Next Paid Invoice Number ---
async function generatePaidInvoiceNumber() {
    try {
        // Count how many invoices have a PaidInvoiceNumber
        const [rows] = await pool.query("SELECT COUNT(*) as count FROM Invoices WHERE PaidInvoiceNumber IS NOT NULL AND PaidInvoiceNumber != ''");
        const count = rows[0].count;
        const nextNum = count + 1;
        // Format: INV-00001
        return `INV-${nextNum.toString().padStart(5, '0')}`;
    } catch (e) {
        console.error("Error generating invoice number:", e);
        return `INV-${Date.now()}`; // Fallback
    }
}

// --- Helper: Format ISO String to MySQL DATETIME in IST ---
function toMysqlDateTime(isoString) {
    // If empty or null, return current time in IST
    if (!isoString) {
        isoString = new Date().toISOString();
    }

    try {
        // Parse the date
        const d = new Date(isoString);
        if (isNaN(d.getTime())) {
            // Invalid date, fallback to now
            const now = new Date();
            return toMysqlDateTime(now.toISOString());
        }

        // Add 5 hours 30 minutes for IST (Indian Standard Time)
        // 5.5 hours * 60 * 60 * 1000 = 19800000 ms
        const istOffset = 19800000;
        const istDate = new Date(d.getTime() + istOffset);

        // Extract UTC components of the shifted date to get IST values
        const yyyy = istDate.getUTCFullYear();
        const mm = String(istDate.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(istDate.getUTCDate()).padStart(2, '0');
        const hh = String(istDate.getUTCHours()).padStart(2, '0');
        const min = String(istDate.getUTCMinutes()).padStart(2, '0');
        const ss = String(istDate.getUTCSeconds()).padStart(2, '0');

        return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
    } catch (e) {
        console.error("Date conversion error:", e);
        // Fallback: simple string replacement if all else fails (riskier but better than crash)
        return new Date().toISOString().slice(0, 19).replace('T', ' ');
    }
}

// --- Payment Gateways Configuration ---

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder'
});

// CCAvenue Crypto Utils (AES-128-CBC)
const ccav = {
    encrypt: function (plainText, workingKey) {
        const m = crypto.createHash('md5');
        m.update(workingKey);
        const key = m.digest(); // Buffer (16 bytes)
        const iv = Buffer.from('\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0a\x0b\x0c\x0d\x0e\x0f', 'binary');
        const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
        let encoded = cipher.update(plainText, 'utf8', 'hex');
        encoded += cipher.final('hex');
        return encoded;
    },
    decrypt: function (encText, workingKey) {
        const m = crypto.createHash('md5');
        m.update(workingKey);
        const key = m.digest(); // Buffer (16 bytes)
        const iv = Buffer.from('\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0a\x0b\x0c\x0d\x0e\x0f', 'binary');
        const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
        let decoded = decipher.update(encText, 'hex', 'utf8');
        decoded += decipher.final('utf8');
        return decoded;
    }
};

// --- API Routes ---

// 1. PRODUCTS
app.get('/api/products', async (req, res) => {
    try {
        const [rows] = await pool.query(`SELECT ID as id, Name as name, Description as description, Rate as rate FROM Products`);
        res.json(rows);
    } catch (err) {
        console.error(err);
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
        console.error(err);
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
        console.error(err);
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
        console.error(err);
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
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/invoices', async (req, res) => {
    const inv = req.body;
    const connection = await pool.getConnection();
    
    // Check if we are marking as PAID (e.g. Cash payment)
    if (inv.status === 'PAID' && (!inv.paidInvoiceNumber || inv.paidInvoiceNumber === '')) {
        inv.paidInvoiceNumber = await generatePaidInvoiceNumber();
    }

    // STRICTLY Format Dates for MySQL (YYYY-MM-DD HH:MM:SS) in IST
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
            // INSERT
            inv.id, inv.invoiceNumber, inv.paidInvoiceNumber, inv.type, sqlDate, sqlDueDate, inv.template, inv.brandColor, inv.logoUrl, inv.sellerName, inv.businessName, inv.sellerAddress,
            inv.sellerGstin, inv.sellerEmail, inv.sellerPhone, inv.buyerName, inv.buyerContactPerson, inv.buyerEmail, inv.buyerPhone, inv.buyerAddress, inv.buyerShippingAddress, inv.placeOfSupply, inv.buyerPinCode,
            inv.resourceSection, inv.resourceName, inv.subtotal, inv.taxRate, inv.taxAmount, inv.total, inv.currency, inv.status, inv.paymentGateway, inv.notes,
            // UPDATE
            inv.invoiceNumber, inv.paidInvoiceNumber, inv.type, sqlDate, sqlDueDate, inv.template, inv.brandColor, inv.logoUrl, inv.sellerName, inv.businessName, inv.sellerAddress,
            inv.sellerGstin, inv.sellerEmail, inv.sellerPhone, inv.buyerName, inv.buyerContactPerson, inv.buyerEmail, inv.buyerPhone, inv.buyerAddress, inv.buyerShippingAddress, inv.placeOfSupply, inv.buyerPinCode,
            inv.resourceSection, inv.resourceName, inv.subtotal, inv.taxRate, inv.taxAmount, inv.total, inv.currency, inv.status, inv.paymentGateway, inv.notes
        ]);

        await connection.query('DELETE FROM LineItems WHERE InvoiceID = ?', [inv.id]);
        
        if (inv.items && inv.items.length > 0) {
            // FIX: Shorten ID to avoid "Data too long" error (Limit 50 chars)
            const itemValues = inv.items.map((item, index) => [
                `li_${Date.now()}_${index}`, 
                inv.id, 
                item.name, 
                item.description, 
                item.quantity, 
                item.rate, 
                item.amount
            ]);
            await connection.query('INSERT INTO LineItems (ID, InvoiceID, ItemName, Description, Quantity, Rate, Amount) VALUES ?', [itemValues]);
        }

        await connection.commit();
        res.json({ success: true, id: inv.id, paidInvoiceNumber: inv.paidInvoiceNumber });

    } catch (err) {
        await connection.rollback();
        console.error("Save Invoice Error:", err);
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
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// 5. NOTIFICATIONS (Email)
app.post('/api/notify', async (req, res) => {
    const { to, subject } = req.body;
    console.log(`\n📧 Email Stub: Sending to ${to}: ${subject}`);
    // Here you would integrate Nodemailer or SendGrid
    res.json({ success: true });
});

// --- WHATSAPP CLOUD API ---
app.post('/api/whatsapp/send', async (req, res) => {
    const { to, type, invoiceNumber, link, amount, businessName } = req.body;
    const token = process.env.WHATSAPP_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_ID;

    // Sanitize phone number (remove +, spaces, hyphens)
    // WhatsApp Cloud API expects country code without +
    const cleanPhone = to ? to.replace(/[^0-9]/g, '') : '';

    console.log(`\n📱 WhatsApp Request: ${cleanPhone}`);

    if (!token || !phoneId) {
        console.warn("⚠️ WhatsApp Credentials Missing in .env (WHATSAPP_TOKEN, WHATSAPP_PHONE_ID)");
        // Return a mock success so frontend doesn't crash, but log error
        return res.json({ success: true, message: "Stub mode: Credentials not set" });
    }

    try {
        // Construct the message payload
        const payload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: cleanPhone,
            type: "text",
            text: {
                // NOTE: Cloud API allows free-form text ONLY if the user has messaged you within 24h.
                // Otherwise, you MUST use a template. For simplicity here, we assume a session is open or test mode.
                body: `Dear Customer,\n\nPlease find your ${type} #${invoiceNumber} for ${amount}.\n\nView here: ${link}\n\nRegards,\n${businessName}`
            }
        };

        const response = await fetch(`https://graph.facebook.com/v17.0/${phoneId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        if (data.error) {
            console.error("❌ WhatsApp API Error:", data.error);
            // Return 400 so frontend knows it failed
            return res.status(400).json({ error: data.error.message });
        }

        console.log("✅ WhatsApp Message Sent ID:", data.messages ? data.messages[0].id : 'Unknown');
        res.json(data);

    } catch (error) {
        console.error("❌ WhatsApp Request Failed:", error);
        res.status(500).json({ error: error.message });
    }
});

// 6. PAYMENTS

// --- Razorpay ---
app.post('/api/payment/razorpay/create-order', async (req, res) => {
    const { amount, currency, receipt } = req.body;
    try {
        const order = await razorpay.orders.create({
            amount: Math.round(amount * 100),
            currency: currency || 'INR',
            receipt: receipt
        });
        res.json({ ...order, key_id: process.env.RAZORPAY_KEY_ID });
    } catch (err) {
        console.error("Razorpay Error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/payment/razorpay/verify', async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, invoice_id } = req.body;
    
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body.toString()).digest('hex');

    if (expectedSignature === razorpay_signature) {
        // Payment Success - Generate Invoice Number
        const paidInvoiceNumber = await generatePaidInvoiceNumber();
        await pool.query('UPDATE Invoices SET Status = ?, PaymentGateway = ?, PaidInvoiceNumber = ? WHERE ID = ?', ['PAID', 'Razorpay', paidInvoiceNumber, invoice_id]);
        res.json({ status: 'success' });
    } else {
        res.status(400).json({ status: 'failure' });
    }
});

// --- CCAvenue ---
app.post('/api/payment/initiate', (req, res) => {
    const { order_id, amount, currency, billing_name, billing_address, email, billing_tel } = req.body;
    
    const merchantId = process.env.CCAV_MERCHANT_ID;
    const accessCode = process.env.CCAV_ACCESS_CODE;
    const workingKey = process.env.CCAV_WORKING_KEY;

    if (!merchantId || !accessCode || !workingKey) {
        return res.status(500).send("Error: CCAvenue credentials missing in .env file");
    }

    const redirectUrl = `${req.protocol}://${req.get('host')}/api/payment/ccavResponseHandler`;
    const cancelUrl = `${req.protocol}://${req.get('host')}/api/payment/ccavResponseHandler`;

    const paramsMap = new URLSearchParams();
    paramsMap.append('merchant_id', merchantId);
    paramsMap.append('order_id', order_id);
    paramsMap.append('currency', currency);
    paramsMap.append('amount', amount);
    paramsMap.append('redirect_url', redirectUrl);
    paramsMap.append('cancel_url', cancelUrl);
    paramsMap.append('language', 'EN');
    paramsMap.append('billing_name', billing_name);
    paramsMap.append('billing_address', billing_address);
    paramsMap.append('billing_email', email);
    paramsMap.append('billing_tel', billing_tel);

    const params = paramsMap.toString();
    const encRequest = ccav.encrypt(params, workingKey);

    const form = `
        <html>
        <head><title>Redirecting to Payment...</title></head>
        <body>
            <center>
                <h2>Please wait, redirecting to CCAvenue...</h2>
                <form id="nonseamless" method="post" name="redirect" action="https://secure.ccavenue.com/transaction/transaction.do?command=initiateTransaction"> 
                    <input type="hidden" id="encRequest" name="encRequest" value="${encRequest}">
                    <input type="hidden" name="access_code" id="access_code" value="${accessCode}">
                </form>
                <script language="javascript">document.redirect.submit();</script>
            </center>
        </body>
        </html>
    `;
    res.send(form);
});

app.post('/api/payment/ccavResponseHandler', async (req, res) => {
    const { encResp } = req.body;
    const workingKey = process.env.CCAV_WORKING_KEY;
    
    let decrypted = '';
    try {
        decrypted = ccav.decrypt(encResp, workingKey);
    } catch(e) {
        console.error("CCAvenue Decryption Failed:", e);
        return res.send("<script>window.close();</script>");
    }
    
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

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});