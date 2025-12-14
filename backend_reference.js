/**
 * BACKEND REFERENCE IMPLEMENTATION (Node.js / Express)
 * 
 * Implements CCAvenue Integration Kit logic.
 * Supports both AES-128-CBC (Standard/Old) and AES-256-GCM (New).
 * 
 * Usage:
 * 1. Run: npm install
 * 2. Run: node backend_reference.js
 */

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const crypto = require('crypto');
const qs = require('querystring'); 

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --- CONFIGURATION ---

// 1. SELECT ALGORITHM VERSION: 128 or 256
// CHANGE THIS based on which Kit CCAvenue gave you.
const CODE_VERSION = 128; 

// 2. CONFIGURATION (Defaulting to Test Keys from your provided Kit)
const ccavenueConfig = {
    // Keys from your provided Kit (AES-128 Test Environment)
    workingKey: process.env.WORKING_KEY || '6021B65F58276621F3C2ADC921A7AD65', 
    merchantId: process.env.MERCHANT_ID || '4411688',
    accessCode: process.env.ACCESS_CODE || 'AVGY85MK93BL01YGLB',
    
    // For Production, change these to:
    // workingKey: 'YOUR_PROD_WORKING_KEY',
    // merchantId: 'YOUR_PROD_MERCHANT_ID',
    // accessCode: 'YOUR_PROD_ACCESS_CODE',
};

// URL Selection based on Version (Matches your Kit files)
// AES-128 uses transaction.do, AES-256 uses gTransaction.do
const TRANSACTION_URL = CODE_VERSION === 256 
    ? 'https://secure.ccavenue.com/gTransaction.do?command=initiateTransaction'
    : 'https://test.ccavenue.com/transaction/transaction.do?command=initiateTransaction'; 

// --- CRYPTO LOGIC ---

/**
 * AES-128-CBC (Standard Kit)
 * Logic mirrored from: NodeJS_Integration_Kit/AES-128/customData/ccavutil.js
 */
const Crypto128 = {
    encrypt: function (plainText, workingKey) {
        try {
            const m = crypto.createHash('md5');
            m.update(workingKey);
            const key = m.digest(); // 16 byte buffer (Binary digest)
            // Fixed IV from kit
            const iv = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f]);
            
            const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
            let encoded = cipher.update(plainText, 'utf8', 'hex');
            encoded += cipher.final('hex');
            return encoded;
        } catch (e) {
            console.error("AES-128 Encryption Failed:", e.message);
            return null;
        }
    },
    decrypt: function (encText, workingKey) {
        try {
            const m = crypto.createHash('md5');
            m.update(workingKey);
            const key = m.digest();
            const iv = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f]);
            
            const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
            let decoded = decipher.update(encText, 'hex', 'utf8');
            decoded += decipher.final('utf8');
            return decoded;
        } catch (e) {
            console.error("AES-128 Decryption Failed:", e.message);
            return null;
        }
    }
};

/**
 * AES-256-GCM (Newer Kit)
 * Logic mirrored from: NodeJS_Integration_Kit/AES-256/ccavutil.js
 */
const Crypto256 = {
    encrypt: function (plainText, workingKey) {
        try {
            const algorithm = 'aes-256-gcm';
            // NOTE: In AES-256 kit, key is passed directly. 
            // Ensure your workingKey is 32 chars.
            const key = workingKey; 
            const iv = crypto.randomBytes(12);
            const cipher = crypto.createCipheriv(algorithm, key, iv);

            const encrypted = Buffer.concat([
                cipher.update(plainText, 'utf8'),
                cipher.final()
            ]);

            const authTag = cipher.getAuthTag();
            
            // Returns IV(hex) + Encrypted(hex) + Tag(hex)
            // Kit Logic: return iv.toString('hex') + Buffer.concat([encrypted, authTag]).toString('hex');
            return iv.toString('hex') + Buffer.concat([encrypted, authTag]).toString('hex');
        } catch (e) {
            console.error("AES-256 Encryption Failed:", e.message);
            return null;
        }
    },
    decrypt: function (encryptedText, workingKey) {
        try {
            const algorithm = 'aes-256-gcm';
            const key = workingKey;
            
            const encryptedBuffer = Buffer.from(encryptedText, 'hex');
            
            // Kit Logic:
            // IV = First 12 bytes
            // Tag = Last 16 bytes
            // CipherText = The middle part
            const iv = encryptedBuffer.slice(0, 12);
            const authTag = encryptedBuffer.slice(encryptedBuffer.length - 16);
            const ciphertext = encryptedBuffer.slice(12, encryptedBuffer.length - 16);

            const decipher = crypto.createDecipheriv(algorithm, key, iv);
            decipher.setAuthTag(authTag);

            const decrypted = Buffer.concat([
                decipher.update(ciphertext),
                decipher.final()
            ]);

            return decrypted.toString('utf8');
        } catch (e) {
            console.error("AES-256 Decryption Failed:", e.message);
            return null;
        }
    }
};

// Select Helper based on CODE_VERSION
const ccav = CODE_VERSION === 256 ? Crypto256 : Crypto128;

// --- ENDPOINTS ---

// 1. Initiate Payment
app.post('/api/payment/initiate', (req, res) => {
    console.log(`Received Payment Request. Using AES-${CODE_VERSION}`);
    
    // 1. Extract Data from Frontend
    const { 
        order_id, amount, currency, 
        billing_name, billing_address, email, billing_tel 
    } = req.body;

    // 2. Prepare CCAvenue Parameters
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
        // You can add merchant_param1, etc here if needed
    };
    
    // 3. Stringify & Encrypt
    const bodyData = qs.stringify(params);
    const encRequest = ccav.encrypt(bodyData, ccavenueConfig.workingKey);

    if (!encRequest) {
        return res.status(500).send("Error: Encryption failed. Check console for details.");
    }

    // 4. Generate Auto-Submit HTML Form
    // This matches the 'ccavRequestHandler.js' logic but adapted for our React Modal
    const formBody = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Redirecting to Payment...</title>
            <script>
                window.onload = function() {
                    document.forms['redirect'].submit();
                };
            </script>
            <style>
               body { display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; font-family: sans-serif; background: #fff; }
               .loader { border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; }
               @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
               .msg { margin-top: 10px; color: #555; }
            </style>
        </head>
        <body>
            <div style="text-align:center">
                <div class="loader" style="margin:0 auto;"></div>
                <div class="msg">Connecting to CCAvenue Secure Gateway...</div>
            </div>
            <form id="nonseamless" method="post" name="redirect" action="${TRANSACTION_URL}"> 
                <input type="hidden" id="encRequest" name="encRequest" value="${encRequest}">
                <input type="hidden" name="access_code" id="access_code" value="${ccavenueConfig.accessCode}">
            </form>
        </body>
        </html>
    `;

    // Return HTML to Frontend
    res.setHeader('Content-Type', 'text/html');
    res.send(formBody);
});

// 2. Payment Callback
app.post('/api/payment/callback', (req, res) => {
    console.log("Received Callback from CCAvenue");
    
    const encResp = req.body.encResp;
    
    if (!encResp) {
        return res.status(400).send("Error: No encrypted response received.");
    }

    // Decrypt
    const ccavResponse = ccav.decrypt(encResp, ccavenueConfig.workingKey);
    
    if (!ccavResponse) {
        return res.status(500).send("Error: Decryption failed. Key mismatch or data corruption.");
    }

    // Parse Data
    const data = qs.parse(ccavResponse);
    console.log("Transaction Status:", data.order_status);
    
    const orderStatus = data.order_status;
    
    let messageType = 'PAYMENT_ERROR';
    let displayMessage = 'Transaction Failed';
    let color = 'red';
    
    if (orderStatus === 'Success') {
        messageType = 'PAYMENT_SUCCESS';
        displayMessage = 'Payment Successful!';
        color = 'green';
    } else if (orderStatus === 'Aborted' || orderStatus === 'Failure') {
        messageType = 'PAYMENT_CANCEL';
        displayMessage = 'Payment Failed or Aborted.';
    }

    // Render HTML that communicates with the React Parent Window
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Payment Status</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; text-align: center; padding-top: 50px; }
                h2 { color: ${color}; }
            </style>
        </head>
        <body>
            <center>
                <h2>${displayMessage}</h2>
                <p>Redirecting you back to the invoice...</p>
            </center>
            <script>
                setTimeout(function() {
                    // Send message to React Parent Component
                    if(window.parent) {
                        window.parent.postMessage('${messageType}', '*');
                    }
                }, 1500);
            </script>
        </body>
        </html>
    `);
});

app.listen(PORT, () => {
    console.log(`------------------------------------------------`);
    console.log(`CCAvenue Backend running at http://localhost:${PORT}`);
    console.log(`Algorithm: AES-${CODE_VERSION}`);
    console.log(`Target URL: ${TRANSACTION_URL}`);
    console.log(`------------------------------------------------`);
});