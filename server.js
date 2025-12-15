// ... (previous code)

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
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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

// ... (rest of the file)
