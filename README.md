# Wappie Finance - Production Deployment

## Hostinger Deployment Guide

### 1. Build the Frontend
Before uploading to your host, generate the optimized static files:
```bash
npm run build
```
This creates a `dist` folder.

### 2. Prepare Database
1. Create a MySQL Database in your Hostinger Panel.
2. Note down the Database Name, User, and Password.
3. Import your tables using the `db_setup.js` script or MySQL Workbench.

### 3. Setup Environment Variables
On your server, create a `.env` file or set environment variables in the Node.js selector:
```env
DB_SERVER=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
API_KEY=your_gemini_api_key
PORT=3000
```

### 4. Upload Files
Upload everything **except** `node_modules` to your server.
Ensure the `dist` folder is present in the root.

### 5. Start the Application
Hostinger's Node.js selector will look for the entry point. Point it to `server.js`.
The server will automatically serve the API and the React frontend on the same port.

## AI Features
This version includes **Gemini-3-Flash** integration to generate friendly, professional summaries for your clients on the invoice viewing page.