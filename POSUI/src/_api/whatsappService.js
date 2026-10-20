import apiClient from './apiClient';

export const whatsappService = {
  checkStatus: async () => {
    try {
      const data = await apiClient.get('/api/whatsapp/status');
      if (data) {
        return {
          isReady: Boolean(data.isReady),
          isConnected: Boolean(data.isConnected || data.phoneConnected),
          phoneConnected: Boolean(data.phoneConnected || data.isConnected),
          pairedNumber: data.phone || data.pairedNumber || null,
          batteryPercent: data.battery ? parseInt(data.battery, 10) : 98,
          qrDataUrl: data.qrDataUrl || null,
          lastMessageSent: data.lastMessageSent || null
        };
      }
    } catch (e) {
      console.warn('WhatsApp status check failed:', e.message);
    }

    return {
      isReady: false,
      isConnected: false,
      phoneConnected: false,
      pairedNumber: null,
      batteryPercent: 0,
      qrDataUrl: null
    };
  },

  getQrCode: async () => {
    try {
      const data = await apiClient.get('/api/whatsapp/qr');
      if (data && data.qrDataUrl) return data.qrDataUrl;
    } catch (e) {
      console.warn('WhatsApp getQrCode failed:', e.message);
    }
    return null;
  },

  requestPairingCode: async (phoneNumber) => {
    return await apiClient.post('/api/whatsapp/request-code', { phoneNumber });
  },

  refreshQr: async () => {
    return await apiClient.post('/api/whatsapp/refresh-qr');
  },

  resetSession: async () => {
    return await apiClient.post('/api/whatsapp/reset');
  },

  sendTestMessage: async (to, message) => {
    const formattedPhone = (to || '9876543210').replace(/[^0-9]/g, '');
    const payload = {
      to: `+91${formattedPhone.slice(-10)}`,
      message: message || 'DailyMart POS: Test connection successful! WhatsApp gateway is paired & functional.'
    };
    return await apiClient.post('/api/whatsapp/send', payload);
  },

  sendInvoiceReceipt: async (invoice) => {
    if (!invoice.MobileNumber) {
      return { success: false, reason: 'No mobile number provided' };
    }

    const itemsList = (invoice.Items || []).map((item, idx) => 
      `${idx + 1}. ${item.ProductName} x ${item.Quantity} = ₹${(item.Total || 0).toFixed(2)}`
    ).join('\n');

    const formattedMessage = 
`*${invoice.StoreName || 'DailyMart Express'}*
${invoice.StoreAddress || 'Plot 12, MG Road, Mumbai'}
GSTIN: ${invoice.StoreGst || '27AABCU9603R1ZM'} | FSSAI: ${invoice.StoreFssai || '11522001000123'}
--------------------------------
*INVOICE: ${invoice.DocumentNumber}*
Date: ${new Date(invoice.Date).toLocaleString('en-IN')}
Customer: ${invoice.CustomerName} (+91${invoice.MobileNumber})
Payment Mode: ${invoice.ModeOfPayment === 0 ? 'Cash' : 'UPI'} (Paid)
--------------------------------
${itemsList}
--------------------------------
Subtotal: ₹${(invoice.Subtotal || 0).toFixed(2)}
CGST: ₹${(invoice.Cgst || 0).toFixed(2)}
SGST: ₹${(invoice.Sgst || 0).toFixed(2)}
${(invoice.Igst || 0) > 0 ? `IGST: ₹${invoice.Igst.toFixed(2)}\n` : ''}Round-off: ₹${(invoice.RoundOff || 0).toFixed(2)}
*GRAND TOTAL: ₹${(invoice.Amount || 0).toFixed(2)}*
--------------------------------
Thank you for shopping with us!
Visit again: https://dailymart.in`;

    return await apiClient.post('/api/whatsapp/send', {
      to: `+91${invoice.MobileNumber}`,
      message: formattedMessage,
      invoiceId: invoice.Id
    });
  },

  getOutboxMessages: async () => {
    const data = await apiClient.get('/api/whatsapp/outbox');
    return Array.isArray(data) ? data : [];
  },

  retryOutboxMessage: async (id) => {
    return await apiClient.post(`/api/whatsapp/outbox/${id}/retry`);
  }
};

export default whatsappService;
