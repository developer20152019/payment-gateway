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
app.use(express.json({ limit: '50mb' })); // Increased limit for Base64 PDFs/Images
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

// Test DB Connection on Start
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

// --- Payment Gateways Configuration ---

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder'
});

// CCAvenue Crypto Utils (AES-128-CBC)
// Matches the standard Node.js Integration Kit logic
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

// --- API Routes ---

// 1. PRODUCTS
// We use aliases (AS) to ensure JSON returns camelCase keys matching the frontend interfaces
app.get('/api/products', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                ID as id, 
                Name as name, 
                Description as description, 
                Rate as rate 
            FROM Products
        `);
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
            INSERT INTO Products (ID, Name, Description, Rate) 
            VALUES (?, ?, ?, ?) 
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
            SELECT 
                ID as id, 
                Name as name, 
                ContactPerson as contactPerson, 
                Email as email, 
                Phone as phone, 
                Address as address, 
                ShippingAddress as shippingAddress, 
                Gstin as gstin, 
                PlaceOfSupply as placeOfSupply, 
                PinCode as pinCode 
            FROM Customers
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
        `, [
            id, name, contactPerson, email, phone, address, shippingAddress, gstin, placeOfSupply, pinCode,
            name, contactPerson, email, phone, address, shippingAddress, gstin, placeOfSupply, pinCode
        ]);
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
            SELECT 
                ID as id,
                SellerName as sellerName,
                BusinessName as businessName,
                SellerAddress as sellerAddress,
                SellerGstin as sellerGstin,
                SellerEmail as sellerEmail,
                SellerPhone as sellerPhone,
                LogoUrl as logoUrl,
                BrandColor as brandColor
            FROM SellerProfile LIMIT 1
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
        `, [
            fixedId, sellerName, businessName, sellerAddress, sellerGstin, sellerEmail, sellerPhone, logoUrl, brandColor,
            sellerName, businessName, sellerAddress, sellerGstin, sellerEmail, sellerPhone, logoUrl, brandColor
        ]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. INVOICES
app.get('/api/invoices', async (req, res) => {
    try {
        // We select * here because Invoice data structure is large.
        // The frontend service handles the mapping from TitleCase (DB) to camelCase (JS).
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
        // Fetch Line Items
        const [items] = await pool.query(`
            SELECT 
                ID as id,
                ItemName as name,
                Description as description,
                Quantity as quantity,
                Rate as rate,
                Amount as amount
            FROM LineItems WHERE InvoiceID = ?
        `, [invoice.ID]);
        
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
    
    try {
        await connection.beginTransaction();

        // 1. Upsert Invoice
        await connection.query(`
            INSERT INTO Invoices 
            (ID, InvoiceNumber, Type, Date, DueDate, Template, BrandColor, LogoUrl, SellerName, BusinessName, SellerAddress, 
            SellerGstin, SellerEmail, SellerPhone, BuyerName, BuyerContactPerson, BuyerEmail, BuyerPhone, BuyerAddress, BuyerShippingAddress, PlaceOfSupply, BuyerPinCode,
            ResourceSection, ResourceName, Subtotal, TaxRate, TaxAmount, Total, Currency, Status, PaymentGateway, Notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            InvoiceNumber=?, Type=?, Date=?, DueDate=?, Template=?, BrandColor=?, LogoUrl=?, SellerName=?, BusinessName=?, SellerAddress=?,
            SellerGstin=?, SellerEmail=?, SellerPhone=?, BuyerName=?, BuyerContactPerson=?, BuyerEmail=?, BuyerPhone=?, BuyerAddress=?, BuyerShippingAddress=?, PlaceOfSupply=?, BuyerPinCode=?,
            ResourceSection=?, ResourceName=?, Subtotal=?, TaxRate=?, TaxAmount=?, Total=?, Currency=?, Status=?, PaymentGateway=?, Notes=?
        `, [
            // INSERT params
            inv.id, inv.invoiceNumber, inv.type, inv.date, inv.dueDate, inv.template, inv.brandColor, inv.logoUrl, inv.sellerName, inv.businessName, inv.sellerAddress,
            inv.sellerGstin, inv.sellerEmail, inv.sellerPhone, inv.buyerName, inv.buyerContactPerson, inv.buyerEmail, inv.buyerPhone, inv.buyerAddress, inv.buyerShippingAddress, inv.placeOfSupply, inv.buyerPinCode,
            inv.resourceSection, inv.resourceName, inv.subtotal, inv.taxRate, inv.taxAmount, inv.total, inv.currency, inv.status, inv.paymentGateway, inv.notes,
            // UPDATE params
            inv.invoiceNumber, inv.type, inv.date, inv.dueDate, inv.template, inv.brandColor, inv.logoUrl, inv.sellerName, inv.businessName, inv.sellerAddress,
            inv.sellerGstin, inv.sellerEmail, inv.sellerPhone, inv.buyerName, inv.buyerContactPerson, inv.buyerEmail, inv.buyerPhone, inv.buyerAddress, inv.buyerShippingAddress, inv.placeOfSupply, inv.buyerPinCode,
            inv.resourceSection, inv.resourceName, inv.subtotal, inv.taxRate, inv.taxAmount, inv.total, inv.currency, inv.status, inv.paymentGateway, inv.notes
        ]);

        // 2. Replace Line Items (Delete all and re-insert)
        await connection.query('DELETE FROM LineItems WHERE InvoiceID = ?', [inv.id]);
        
        if (inv.items && inv.items.length > 0) {
            const itemValues = inv.items.map(item => [
                item.id, 
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
        res.json({ success: true, id: inv.id });

    } catch (err) {
        await connection.rollback();
        console.error(err);
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

// 5. NOTIFICATION (Stub for now)
app.post('/api/notify', async (req, res) => {
    const { to, subject, body, attachments } = req.body;
    console.log(`\n================ EMAIL SIMULATION ================`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    if(attachments) console.log(`Attachment: ${attachments.length} file(s)`);
    console.log(`==================================================\n`);
    
    // Integration point: Use nodemailer here to send real emails
    
    res.json({ success: true, message: "Email logged to console" });
});

// 6. PAYMENTS

// --- Razorpay ---
app.post('/api/payment/razorpay/create-order', async (req, res) => {
    const { amount, currency, receipt } = req.body;
    try {
        const order = await razorpay.orders.create({
            amount: Math.round(amount * 100), // convert to smallest currency unit (paise)
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
    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

    if (expectedSignature === razorpay_signature) {
        // Update Invoice Status
        await pool.query('UPDATE Invoices SET Status = ?, PaymentGateway = ? WHERE ID = ?', ['PAID', 'Razorpay', invoice_id]);
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

    // Prepare CCAvenue Request
    const redirectUrl = `${req.protocol}://${req.get('host')}/api/payment/ccavResponseHandler`;
    const cancelUrl = `${req.protocol}://${req.get('host')}/api/payment/ccavResponseHandler`;

    const params = `merchant_id=${merchantId}&order_id=${order_id}&currency=${currency}&amount=${amount}&redirect_url=${redirectUrl}&cancel_url=${cancelUrl}&language=EN&billing_name=${billing_name}&billing_address=${billing_address}&billing_email=${email}&billing_tel=${billing_tel}`;

    // Encrypt
    const encRequest = ccav.encrypt(params, workingKey);

    // Serve Auto-Submit Form
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
    
    // Parse response string: "order_id=123&tracking_id=...&order_status=Success..."
    const params = new URLSearchParams(decrypted);
    const orderStatus = params.get('order_status');
    const orderId = params.get('order_id');

    let htmlResponse = '';

    if (orderStatus === 'Success') {
        await pool.query('UPDATE Invoices SET Status = ?, PaymentGateway = ? WHERE ID = ?', ['PAID', 'CCAvenue', orderId]);
        // Post message to parent window (Frontend) to update UI
        htmlResponse = `<script>window.opener.postMessage('PAYMENT_SUCCESS', '*'); window.close();</script>`;
    } else {
        await pool.query('UPDATE Invoices SET Status = ? WHERE ID = ?', ['FAILED', orderId]);
        htmlResponse = `<script>window.opener.postMessage('PAYMENT_CANCEL', '*'); window.close();</script>`;
    }

    res.send(htmlResponse);
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});