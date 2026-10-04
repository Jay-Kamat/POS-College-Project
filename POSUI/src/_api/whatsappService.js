// WhatsApp Gateway Integration Service Layer
const OPENWA_URL = import.meta.env.VITE_OPENWA_API_URL || 'http://localhost:2785/api/v1';

export const whatsappService = {
  checkStatus: async () => {
    try {
      const res = await fetch(`${OPENWA_URL}/session/status`);
      if (res.ok) {
        return await res.json();
      }
      return { isReady: false, authenticated: false };
    } catch (err) {
      console.warn('OpenWA gateway not reachable at :2785', err.message);
      return { isReady: false, authenticated: false };
    }
  },

  sendInvoiceReceipt: async (invoice) => {
    if (!invoice.MobileNumber) {
      return { success: false, reason: 'No mobile number provided' };
    }

    // Format text receipt according to docs/INVOICE_RECEIPT_SPEC.md
    const itemsList = invoice.Items.map((item, idx) => 
      `${idx + 1}. ${item.ProductName} x ${item.Quantity} = ₹${item.Total.toFixed(2)}`
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
Subtotal: ₹${invoice.Subtotal.toFixed(2)}
CGST: ₹${invoice.Cgst.toFixed(2)}
SGST: ₹${invoice.Sgst.toFixed(2)}
${invoice.Igst > 0 ? `IGST: ₹${invoice.Igst.toFixed(2)}\n` : ''}Round-off: ₹${invoice.RoundOff.toFixed(2)}
*GRAND TOTAL: ₹${invoice.Amount.toFixed(2)}*
--------------------------------
Thank you for shopping with us!
Visit again: https://dailymart.in`;

    try {
      const response = await fetch(`${OPENWA_URL}/messages/send-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: `+91${invoice.MobileNumber}`,
          message: formattedMessage
        })
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, messageId: data.messageId };
      } else {
        const errData = await response.json();
        return { success: false, error: errData.message || 'Failed to dispatch WhatsApp receipt' };
      }
    } catch (err) {
      console.warn('OpenWA dispatch error:', err);
      return { 
        success: false, 
        error: 'WhatsApp gateway offline on port 2785. Receipt ready for manual reprint.' 
      };
    }
  }
};

export default whatsappService;
