{
  "id": "string",
  "tenantId": "string",
  "clientId": "string",
  "clientName": "string",
  "clientEmail": "string",
  "clientPhone": "string",
  "status": "'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'",
  "items": [
    {
      "productId": "string",
      "productName": "string",
      "variation": {
        "material": "string",
        "format": "string",
        "width": "number",
        "weight": "number",
        "price": "number"
      },
      "quantity": "number",
      "price": "number",
      "customizations?": "Record<string, any>"
    }
  ],
  "customizations?": "Record<string, any>",
  "deliveryAddress?": {
    "street": "string",
    "number": "string",
    "complement?": "string",
    "neighborhood": "string",
    "city": "string",
    "state": "string",
    "zipCode": "string"
  },
  "paymentDetails": {
    "method?": "string",
    "status": "'pending' | 'paid' | 'failed'",
    "transactionId?": "string",
    "installments?": "number"
  },
  "totalAmount": "number",
  "timeline": [
    {
      "title": "string",
      "description?": "string",
      "timestamp": "Date",
      "type": "'status_change' | 'payment' | 'shipping' | 'note'"
    }
  ],
  "createdAt": "Date",
  "updatedAt": "Date"
}