# PayLink - Invoice System

## How to Run

### 1. Install Dependencies (Crucial Step)
Before running the backend, you must install the required Node.js modules.
Open your terminal in the project folder and run:

```bash
npm install
```

### 2. Start the Backend
The backend handles CCAvenue encryption/decryption and SQL database interactions.

```bash
node server.js
```
*   It will start on `http://localhost:3000`.
*   If you see "Connected to SQL Server", your database is active.
*   If you see "SQL Server Connection Failed", the app will run in "Payment Only" mode, and invoices will be saved to LocalStorage.

### 3. Start the Frontend
In a separate terminal window:

```bash
npm run dev
```
Open the app in your browser (usually `http://localhost:5173` or `http://localhost:8080`).

## Troubleshooting

### Error: Cannot find module 'express'
This means you skipped step 1. You must run `npm install` to download the required libraries (`express`, `cors`, etc.) defined in `package.json`.

### Backend Unreachable
If the backend is not running, the frontend application will automatically switch to **Simulation Mode**.
- Invoices will be saved to your browser's LocalStorage.
- Payment buttons will show a "Mock Gateway" for testing purposes.

## Configuration
To change keys or switch between **AES-128** and **AES-256**:
1.  Open `server.js`.
2.  Edit `CODE_VERSION` (128 or 256).
3.  Update `ccavenueConfig` with your production keys.
