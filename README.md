# PayLink - Invoice System

## Overview
PayLink is a full-stack invoice generation application.
*   **Frontend**: React (Vite)
*   **Backend**: Node.js (Express)
*   **Database**: MySQL
*   **Payments**: CCAvenue & Razorpay

## Quick Start

### 1. Install Dependencies
Run this in the project root to install libraries for both the backend and frontend.

```bash
npm install
```

### 2. Database Setup (MySQL)
This application works out-of-the-box with a local MySQL installation (like those included with MySQL Installer, XAMPP, or WAMP).

1.  Make sure your MySQL server is running.
2.  (Optional) Create a `.env` file in the root folder if you need custom credentials (default is `root` with no password).

**Example `.env` content:**
```env
DB_SERVER=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=PayLinkDB
PORT=3000
```

### 3. Using MySQL Workbench
You can use MySQL Workbench to view your invoices, customers, and products visually.

1.  Open **MySQL Workbench**.
2.  Click the **+** icon next to "MySQL Connections".
3.  **Connection Name**: PayLink Local
4.  **Hostname**: `localhost` (or your server IP)
5.  **Port**: `3306`
6.  **Username**: `root` (or as defined in your .env)
7.  Click **Test Connection** and then **OK**.
8.  Open the connection. You will see `PayLinkDB` in the "Schemas" sidebar on the left once the app runs.

### 4. Run the Application
This command starts the Backend (port 3000) and the Frontend (port 5173).

```bash
npm run dev
```

*   The database tables will be created automatically via `db_setup.js` on the first run.

## Email Configuration (Gmail)
To send real emails using your Gmail account, you must configure `.env` as follows:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_gmail@gmail.com
SMTP_PASS=your_16_char_app_password
```

**⚠️ Important: You cannot use your standard login password.**
1.  Go to **[Google Account Security](https://myaccount.google.com/security)**.
2.  Enable **2-Step Verification**.
3.  Search for **"App Passwords"**.
4.  Create a new App Password (name it "PayLink").
5.  Use that 16-character code as your `SMTP_PASS`.

## Troubleshooting

### "SQL Server Connection Failed"
If you see this message in the console:
1.  Ensure MySQL is running (check MySQL Workbench or Services).
2.  Verify your username/password in `server.js` or `.env`.
3.  If connection fails, the app will switch to **Storage Mode (Offline)** and save data to the browser's LocalStorage instead.

### "Module not found"
Run `npm install` again to ensure all packages are downloaded.

## Payment Configuration
To enable real payments, configure your keys in `.env` or `server.js`:
*   **CCAvenue**: Update `CCAV_WORKING_KEY`, `CCAV_MERCHANT_ID`, `CCAV_ACCESS_CODE`.
*   **Razorpay**: Update `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`.