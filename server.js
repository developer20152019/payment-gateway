require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const cors = require('cors');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

const dbConfig = {
    host: process.env.DB_SERVER,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306
};

// --- Invoices ---

app.get('/api/invoices', async (req, res) => {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute('SELECT * FROM Invoices ORDER BY Date DESC');
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) await connection.end();
    }
});

app.get('/api/invoices/:id', async (req, res) => {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute('SELECT * FROM Invoices WHERE ID = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Invoice not found' });
        
        const invoice = rows[0];
        const [items] = await connection.execute('SELECT * FROM LineItems WHERE InvoiceID = ?', [req.params.id]);
        
        // Map DB columns to frontend structure if needed (lowercase/camelCase)
        invoice.items = items.map(i => ({
            id: i.ID,
            name: i.ItemName,
            description: i.Description,
            quantity: Number(i.Quantity),
            rate: Number(i.Rate),
            amount: Number(i.Amount)
        }));

        res.json(invoice);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) await connection.end();
    }
});

app.post('/api/invoices', async (req, res) => {
    let connection;
    try {
        const invoice = req.body;
        connection = await mysql.createConnection(dbConfig);
        
        // Numeric safety checks
        invoice.subtotal = parseFloat(invoice.subtotal) || 0;
        invoice.taxRate = parseFloat(invoice.taxRate) || 0;
        invoice.taxAmount = parseFloat(invoice.taxAmount) || 0;
        invoice.total = parseFloat(invoice.total) || 0;

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
                invoice.subtotal, invoice.taxRate, invoice.taxAmount, invoice.total, invoice.currency, invoice.status || 'PENDING', invoice.paymentGateway || '', invoice.notes || '',
                invoice.id
            ]);
        } else {
            // Insert - Using SET syntax to avoid column count mismatch errors
            await connection.execute(`
                INSERT INTO Invoices SET
                ID=?, InvoiceNumber=?, Type=?, Date=?, DueDate=?, Template=?, BrandColor=?, LogoUrl=?,
                SellerName=?, BusinessName=?, SellerAddress=?, SellerGstin=?, SellerEmail=?, SellerPhone=?,
                BuyerName=?, BuyerContactPerson=?, BuyerEmail=?, BuyerPhone=?, BuyerAddress=?, BuyerShippingAddress=?, PlaceOfSupply=?, BuyerPinCode=?,
                ResourceSection=?, ResourceName=?,
                Subtotal=?, TaxRate=?, TaxAmount=?, Total=?, Currency=?, Status=?, PaymentGateway=?, Notes=?
            `, [
                invoice.id, invoice.invoiceNumber, invoice.type || 'INVOICE', invoice.date, invoice.dueDate, invoice.template, invoice.brandColor, invoice.logoUrl || '',
                invoice.sellerName, invoice.businessName, invoice.sellerAddress, invoice.sellerGstin || '', invoice.sellerEmail, invoice.sellerPhone,
                invoice.buyerName, invoice.buyerContactPerson || '', invoice.buyerEmail, invoice.buyerPhone, invoice.buyerAddress, invoice.buyerShippingAddress || '', invoice.placeOfSupply || '', invoice.buyerPinCode || '',
                invoice.resourceSection || '', invoice.resourceName || '',
                invoice.subtotal, invoice.taxRate, invoice.taxAmount, invoice.total, invoice.currency, invoice.status || 'PENDING', invoice.paymentGateway || '', invoice.notes || ''
            ]);
        }

        // Line Items (Delete and Re-insert)
        await connection.execute('DELETE FROM LineItems WHERE InvoiceID = ?', [invoice.id]);
        
        if (invoice.items && invoice.items.length > 0) {
            const itemValues = invoice.items.map(item => [
                item.id || `item_${Date.now()}_${Math.random()}`,
                invoice.id,
                item.name,
                item.description || '',
                item.quantity,
                item.rate,
                item.amount
            ]);
            
            await connection.query(
                'INSERT INTO LineItems (ID, InvoiceID, ItemName, Description, Quantity, Rate, Amount) VALUES ?',
                [itemValues]
            );
        }

        res.json({ success: true, id: invoice.id });
    } catch (error) {
        console.error("Save Error:", error);
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) await connection.end();
    }
});

app.delete('/api/invoices/:id', async (req, res) => {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        await connection.execute('DELETE FROM Invoices WHERE ID = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) await connection.end();
    }
});

// --- Products ---

app.get('/api/products', async (req, res) => {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute('SELECT * FROM Products');
        res.json(rows.map(r => ({ ...r, rate: Number(r.Rate) })));
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) await connection.end();
    }
});

app.post('/api/products', async (req, res) => {
    let connection;
    try {
        const prod = req.body;
        connection = await mysql.createConnection(dbConfig);
        
        const [check] = await connection.execute('SELECT ID FROM Products WHERE ID = ?', [prod.id]);
        
        if (check.length > 0) {
            await connection.execute('UPDATE Products SET Name=?, Description=?, Rate=? WHERE ID=?', 
                [prod.name, prod.description, prod.rate, prod.id]);
        } else {
            await connection.execute('INSERT INTO Products (ID, Name, Description, Rate) VALUES (?, ?, ?, ?)', 
                [prod.id, prod.name, prod.description, prod.rate]);
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) await connection.end();
    }
});

app.delete('/api/products/:id', async (req, res) => {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        await connection.execute('DELETE FROM Products WHERE ID = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) await connection.end();
    }
});

// --- Customers ---

app.get('/api/customers', async (req, res) => {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute('SELECT * FROM Customers');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) await connection.end();
    }
});

app.post('/api/customers', async (req, res) => {
    let connection;
    try {
        const cust = req.body;
        connection = await mysql.createConnection(dbConfig);
        
        const [check] = await connection.execute('SELECT ID FROM Customers WHERE ID = ?', [cust.id]);
        
        if (check.length > 0) {
            await connection.execute(`
                UPDATE Customers SET 
                Name=?, ContactPerson=?, Email=?, Phone=?, Address=?, ShippingAddress=?, Gstin=?, PlaceOfSupply=?, PinCode=? 
                WHERE ID=?`, 
                [cust.name, cust.contactPerson || '', cust.email, cust.phone, cust.address, cust.shippingAddress || '', cust.gstin || '', cust.placeOfSupply || '', cust.pinCode || '', cust.id]);
        } else {
            await connection.execute(`
                INSERT INTO Customers 
                (ID, Name, ContactPerson, Email, Phone, Address, ShippingAddress, Gstin, PlaceOfSupply, PinCode) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
                [cust.id, cust.name, cust.contactPerson || '', cust.email, cust.phone, cust.address, cust.shippingAddress || '', cust.gstin || '', cust.placeOfSupply || '', cust.pinCode || '']);
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) await connection.end();
    }
});

app.delete('/api/customers/:id', async (req, res) => {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        await connection.execute('DELETE FROM Customers WHERE ID = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) await connection.end();
    }
});

// --- Settings ---

app.get('/api/settings/seller', async (req, res) => {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute('SELECT * FROM SellerProfile LIMIT 1');
        res.json(rows[0] || {});
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) await connection.end();
    }
});

app.post('/api/settings/seller', async (req, res) => {
    let connection;
    try {
        const profile = req.body;
        connection = await mysql.createConnection(dbConfig);
        
        // Only one profile supported, ID='DEFAULT'
        const id = 'DEFAULT'; 
        const [check] = await connection.execute('SELECT ID FROM SellerProfile WHERE ID = ?', [id]);
        
        if (check.length > 0) {
            await connection.execute(`
                UPDATE SellerProfile SET 
                SellerName=?, BusinessName=?, SellerAddress=?, SellerGstin=?, SellerEmail=?, SellerPhone=?, LogoUrl=?, BrandColor=?
                WHERE ID=?`,
                [profile.sellerName, profile.businessName, profile.sellerAddress, profile.sellerGstin, profile.sellerEmail, profile.sellerPhone, profile.logoUrl, profile.brandColor, id]);
        } else {
            await connection.execute(`
                INSERT INTO SellerProfile 
                (ID, SellerName, BusinessName, SellerAddress, SellerGstin, SellerEmail, SellerPhone, LogoUrl, BrandColor)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [id, profile.sellerName, profile.businessName, profile.sellerAddress, profile.sellerGstin, profile.sellerEmail, profile.sellerPhone, profile.logoUrl, profile.brandColor]);
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) await connection.end();
    }
});

// --- Payment: Razorpay ---

app.post('/api/payment/razorpay/create-order', async (req, res) => {
    try {
        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
            throw new Error("Razorpay keys not configured in .env");
        }
        const instance = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });

        const options = {
            amount: Math.round(req.body.amount * 100), // amount in paise
            currency: req.body.currency,
            receipt: req.body.receipt
        };

        const order = await instance.orders.create(options);
        res.json(order);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/payment/razorpay/verify', async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest("hex");

    if (expectedSignature === razorpay_signature) {
        // Payment success, update invoice status
        if (req.body.invoice_id) {
             let connection;
             try {
                connection = await mysql.createConnection(dbConfig);
                await connection.execute("UPDATE Invoices SET Status='PAID' WHERE ID=?", [req.body.invoice_id]);
             } catch(e) {
                 console.error("Failed to update invoice status", e);
             } finally {
                 if(connection) await connection.end();
             }
        }
        res.json({ status: "success" });
    } else {
        res.status(400).json({ status: "failure" });
    }
});

// --- Payment: CCAvenue (Placeholder) ---
// For full implementation, you would need the encryption/decryption logic
// similar to the NodeJS_Integration_Kit folder provided. 
// Assuming a simplified mock or pass-through for now if not using the kit directly.

app.post('/api/payment/initiate', (req, res) => {
    // Return a mock response or use the kit logic
    // If you haven't integrated the kit fully into this single server file, 
    // you can instruct the frontend to use simulation mode by returning 500 or handling it here.
    res.status(501).send("CCAvenue backend integration required.");
});

// --- Notifications ---
app.post('/api/notify', (req, res) => {
    // Placeholder for email logic (Nodemailer, etc.)
    console.log("Email requested:", req.body);
    res.json({ success: true });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});