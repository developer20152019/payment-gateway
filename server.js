/**
 * UNIFIED SERVER (Node.js / Express)
 * 
 * Features:
 * 1. Secure SQL Server Persistence (CRUD for Invoices)
 * 2. CCAvenue Payment Integration (Using NodeJS_Integration_Kit/AES-128)
 * 3. Razorpay Payment Integration (Using 'razorpay' node package)
 * 
 * Usage:
 * 1. npm install
 * 2. npm run dev
 */

// --- DEPENDENCY CHECK ---
let express, cors, sql, bodyParser, qs, ccav, Razorpay, crypto;
try {
    express = require('express');
    cors = require('cors');
    sql = require('mssql');
    bodyParser = require('body-parser');
    qs = require('querystring');
    crypto = require('crypto');
    
    // Razorpay Check
    try {
        Razorpay = require('razorpay');
    } catch (e) {
        console.warn("\x1b[33m%s\x1b[0m", "⚠️  'razorpay' module not found. Razorpay features will be disabled.");
    }

    // CCAvenue Integration Kit Import
    try {
        ccav = require('./NodeJS_Integration_Kit/AES-128/customData/ccavutil.js');
    } catch (kitError) {
        console.error('\n\x1b[31m%s\x1b[0m', ' [ERROR] Integration Kit not found');
        console.error('Expected at: ./NodeJS_Integration_Kit/AES-128/customData/ccavutil.js');
        process.exit(1);
    }

} catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') {
        console.error('\n\x1b[31m%s\x1b[0m', '======================================================');
        console.error('\x1b[31m%s\x1b[0m', ' [ERROR] Missing Backend Dependencies');
        console.error('\x1b[31m%s\x1b[0m', '======================================================');
        console.error('The server cannot start because required modules are missing.');
        console.error('\x1b[33m%s\x1b[0m', 'PLEASE RUN THIS COMMAND TO FIX IT:');
        console.error('\n    npm install express cors mssql body-parser razorpay\n');
        console.error('======================================================\n');
        process.exit(1);
    } else {
        throw e;
    }
}

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// ==========================================
// 1. CONFIGURATION
// ==========================================

const ccavenueConfig = {
    workingKey: process.env.WORKING_KEY || '6021B65F58276621F3C2ADC921A7AD65', 
    merchantId: process.env.MERCHANT_ID || '4411688',
    accessCode: process.env.ACCESS_CODE || 'AVGY85MK93BL01YGLB',
};

const razorpayConfig = {
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_YourKeyID',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'YourKeySecret'
};

const isProduction = process.env.NODE_ENV === 'production';

// CCAvenue URL
const CCAV_URL = isProduction 
    ? 'https://secure.ccavenue.com/transaction/transaction.do?command=initiateTransaction'
    : 'https://test.ccavenue.com/transaction/transaction.do?command=initiateTransaction';

// Initialize Razorpay
let razorpayInstance = null;
if (Razorpay) {
    razorpayInstance = new Razorpay({
        key_id: razorpayConfig.key_id,
        key_secret: razorpayConfig.key_secret
    });
}

// ==========================================
// 2. CCAVENUE ENDPOINTS
// ==========================================

app.post('/api/payment/initiate', (req, res) => {
    const { order_id, amount, currency, billing_name, billing_address, email, billing_tel } = req.body;
    
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

    const formBody = `
        <!DOCTYPE html>
        <html>
        <head><title>Redirecting...</title><script>window.onload=function(){document.forms['redirect'].submit();};</script></head>
        <body>
            <div style="text-align:center; padding-top: 20px;">Contacting Payment Gateway...</div>
            <form id="nonseamless" method="post" name="redirect" action="${CCAV_URL}"> 
                <input type="hidden" id="encRequest" name="encRequest" value="${encRequest}">
                <input type="hidden" name="access_code" id="access_code" value="${ccavenueConfig.accessCode}">
            </form>
        </body>
        </html>
    `;
    res.setHeader('Content-Type', 'text/html');
    res.send(formBody);
});

app.post('/api/payment/callback', async (req, res) => {
    const encResp = req.body.encResp;
    if (!encResp) return res.status(400).send("Error: No response received");

    const ccavResponse = ccav.decrypt(encResp, ccavenueConfig.workingKey);
    if (!ccavResponse) return res.status(500).send("Decryption failed");

    const data = qs.parse(ccavResponse);
    const orderStatus = data.order_status;
    const orderId = data.order_id;
    
    let messageType = 'PAYMENT_CANCEL';
    let displayMessage = 'Payment Failed';
    let color = 'red';
    let dbStatus = 'FAILED';

    if (orderStatus === 'Success') {
        messageType = 'PAYMENT_SUCCESS';
        displayMessage = 'Payment Successful!';
        color = 'green';
        dbStatus = 'PAID';
    } else if (orderStatus === 'Aborted') {
        messageType = 'PAYMENT_CANCEL';
        displayMessage = 'Payment Aborted';
        color = 'orange';
        dbStatus = 'FAILED';
    }

    if (sql.connected && orderId) {
        try {
            console.log(`Updating DB (CCAvenue): Invoice ${orderId} -> ${dbStatus}`);
            await sql.query`UPDATE Invoices SET Status = ${dbStatus} WHERE ID = ${orderId}`;
        } catch (dbErr) {
            console.error("Failed to update database status:", dbErr);
        }
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const redirectUrl = `${frontendUrl}/#/view/${orderId}`;

    res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Status</title></head>
        <body>
            <center>
                <h2 style="color:${color}; font-family: sans-serif;">${displayMessage}</h2>
                <p style="font-family: sans-serif;">Redirecting...</p>
            </center>
            <script>
                setTimeout(function(){ 
                    if(window.opener) {
                        try {
                            window.opener.postMessage('${messageType}', '*');
                            window.close();
                        } catch(e) {
                            window.location.href = '${redirectUrl}';
                        }
                    } else {
                        window.location.href = '${redirectUrl}';
                    }
                }, 1500);
            </script>
        </body>
        </html>
    `);
});

// ==========================================
// 3. RAZORPAY ENDPOINTS
// ==========================================

app.post('/api/payment/razorpay/create-order', async (req, res) => {
    if (!razorpayInstance) return res.status(500).json({ error: "Razorpay not configured" });

    const { amount, currency, receipt } = req.body;

    const options = {
        amount: Math.round(amount * 100), // Convert to smallest currency unit (paise)
        currency: currency,
        receipt: receipt,
        payment_capture: 1
    };

    try {
        const order = await razorpayInstance.orders.create(options);
        res.json({
            id: order.id,
            currency: order.currency,
            amount: order.amount,
            key_id: razorpayConfig.key_id
        });
    } catch (error) {
        console.error("Razorpay Order Error:", error);
        res.status(500).json({ error: "Failed to create order" });
    }
});

app.post('/api/payment/razorpay/verify', async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, invoice_id } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
        .createHmac('sha256', razorpayConfig.key_secret)
        .update(body.toString())
        .digest('hex');

    if (expectedSignature === razorpay_signature) {
        // Signature Valid -> Update DB
        if (sql.connected && invoice_id) {
            try {
                console.log(`Updating DB (Razorpay): Invoice ${invoice_id} -> PAID`);
                await sql.query`UPDATE Invoices SET Status = 'PAID' WHERE ID = ${invoice_id}`;
            } catch (dbErr) {
                console.error("Failed to update database status:", dbErr);
            }
        }
        res.json({ status: "success" });
    } else {
        res.status(400).json({ status: "failure", message: "Invalid Signature" });
    }
});

// ==========================================
// 4. SQL DATABASE ENDPOINTS
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
    console.log("\n\x1b[33m%s\x1b[0m", "⚠️  SQL Server Connection Failed");
    console.log("\x1b[33m%s\x1b[0m", "   Running in Offline Mode: Data will be saved to LocalStorage only.");
});

// Helper to Map SQL Result to Invoice Object
const mapToInvoice = (record, items = []) => ({
    id: record.ID,
    invoiceNumber: record.InvoiceNumber,
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
    subtotal: record.Subtotal,
    taxRate: record.TaxRate,
    taxAmount: record.TaxAmount,
    total: record.Total,
    currency: record.Currency,
    status: record.Status,
    paymentGateway: record.PaymentGateway || 'CCAvenue', // Default for old records
    notes: record.Notes,
    items: items
});

// GET All Invoices
app.get('/api/invoices', async (req, res) => {
    if (!sql.connected) return res.status(503).json({ error: "Database unavailable" });
    try {
        const result = await sql.query`SELECT * FROM Invoices ORDER BY Date DESC`;
        const invoices = result.recordset.map(r => mapToInvoice(r, []));
        res.json(invoices);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET Single Invoice
app.get('/api/invoices/:id', async (req, res) => {
    if (!sql.connected) return res.status(503).json({ error: "Database unavailable" });
    try {
        const result = await sql.query`SELECT * FROM Invoices WHERE ID = ${req.params.id}`;
        if (result.recordset.length === 0) return res.status(404).json({ message: "Not Found" });
        
        const invoiceRecord = result.recordset[0];
        const itemsResult = await sql.query`SELECT * FROM LineItems WHERE InvoiceID = ${req.params.id}`;
        const items = itemsResult.recordset.map(i => ({
            id: i.ID, description: i.Description, quantity: i.Quantity, rate: i.Rate, amount: i.Amount
        }));
        
        res.json(mapToInvoice(invoiceRecord, items));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST Invoice (Create/Update)
app.post('/api/invoices', async (req, res) => {
    if (!sql.connected) return res.status(503).json({ error: "Database unavailable" });
    
    const invoice = req.body;
    const transaction = new sql.Transaction();
    
    try {
        await transaction.begin();
        const request = new sql.Request(transaction);

        request.input('id', sql.NVarChar, invoice.id);
        request.input('invNum', sql.NVarChar, invoice.invoiceNumber);
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
        request.input('sub', sql.Decimal(18,2), invoice.subtotal);
        request.input('taxRate', sql.Decimal(5,2), invoice.taxRate);
        request.input('taxAmt', sql.Decimal(18,2), invoice.taxAmount);
        request.input('total', sql.Decimal(18,2), invoice.total);
        request.input('curr', sql.NVarChar, invoice.currency);
        request.input('status', sql.NVarChar, invoice.status);
        request.input('pg', sql.NVarChar, invoice.paymentGateway || 'CCAvenue');
        request.input('notes', sql.NVarChar, invoice.notes || '');

        const check = await request.query(`SELECT ID FROM Invoices WHERE ID = @id`);
        
        // Note: Make sure to alter your DB table to add PaymentGateway column if not exists
        // ALTER TABLE Invoices ADD PaymentGateway NVARCHAR(50);
        if (check.recordset.length > 0) {
            await request.query(`
                UPDATE Invoices SET 
                InvoiceNumber=@invNum, Date=@date, DueDate=@dueDate, Template=@template, BrandColor=@brandColor, LogoUrl=@logoUrl,
                SellerName=@sName, BusinessName=@bName, SellerAddress=@sAddr, SellerGstin=@sGstin, SellerEmail=@sEmail, SellerPhone=@sPhone,
                BuyerName=@buyName, BuyerEmail=@buyEmail, BuyerPhone=@buyPhone, BuyerAddress=@buyAddr, 
                Subtotal=@sub, TaxRate=@taxRate, TaxAmount=@taxAmt, Total=@total, Currency=@curr, Status=@status, PaymentGateway=@pg, Notes=@notes
                WHERE ID = @id
            `);
        } else {
            await request.query(`
                INSERT INTO Invoices 
                (ID, InvoiceNumber, Date, DueDate, Template, BrandColor, LogoUrl, SellerName, BusinessName, SellerAddress, 
                SellerGstin, SellerEmail, SellerPhone, BuyerName, BuyerEmail, BuyerPhone, BuyerAddress, Subtotal, 
                TaxRate, TaxAmount, Total, Currency, Status, PaymentGateway, Notes)
                VALUES 
                (@id, @invNum, @date, @dueDate, @template, @brandColor, @logoUrl, @sName, @bName, @sAddr, 
                @sGstin, @sEmail, @sPhone, @buyName, @buyEmail, @buyPhone, @buyAddr, @sub, 
                @taxRate, @taxAmt, @total, @curr, @status, @pg, @notes)
            `);
        }

        await request.query(`DELETE FROM LineItems WHERE InvoiceID = @id`);

        for (const item of invoice.items) {
            const itemReq = new sql.Request(transaction);
            itemReq.input('i_id', sql.NVarChar, item.id);
            itemReq.input('inv_id', sql.NVarChar, invoice.id);
            itemReq.input('desc', sql.NVarChar, item.description);
            itemReq.input('qty', sql.Int, item.quantity);
            itemReq.input('rate', sql.Decimal(18,2), item.rate);
            itemReq.input('amt', sql.Decimal(18,2), item.amount);
            
            await itemReq.query(`
                INSERT INTO LineItems (ID, InvoiceID, Description, Quantity, Rate, Amount) 
                VALUES (@i_id, @inv_id, @desc, @qty, @rate, @amt)
            `);
        }

        await transaction.commit();
        res.status(200).json({ message: "Saved successfully" });
    } catch (err) {
        if (transaction._aborted === false) await transaction.rollback();
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE Invoice
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

app.listen(PORT, () => {
    console.log(`-----------------------------------------------------`);
    console.log(`🚀 Unified Server running at http://localhost:${PORT}`);
    console.log(`   - Payment Gateways: CCAvenue, Razorpay`);
    console.log(`   - SQL Database: Connecting...`);
    console.log(`-----------------------------------------------------`);
});