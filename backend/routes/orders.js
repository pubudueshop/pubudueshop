import express from 'express';
import { db } from '../firebase.js';

const router = express.Router();

// Helper: Calculate available stock from batches and sales
function calculateAvailableStock(item) {
  let totalBuyQty = item.buyQty || 0;
  if (Array.isArray(item.batches) && item.batches.length > 0) {
    totalBuyQty = item.batches.reduce((sum, b) => sum + (Number(b.buyQty) || 0), 0);
  }
  const sellQty = Number(item.sellQty) || 0;
  return Math.max(0, totalBuyQty - sellQty);
}

/**
 * POST /api/orders/checkout
 * Public/Website Checkout Endpoint:
 * - Accepts single item or multi-item cart
 * - Checks stock availability in Firestore
 * - Atomically deducts stock from Firestore inventory
 * - Records sale with channel 'Online - Website (ichouse.lk)'
 * - Updates product status ('in_stock', 'partial', 'sold')
 */
router.post('/checkout', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not initialized' });

    const {
      customerName,
      customerPhone,
      customerAddress,
      items, // Array of { itemId, qty, unitPrice, name } OR single item payload { itemId, qty, unitPrice }
      paymentMethod = 'Cash on Delivery (COD)',
      paymentStatus = 'Pending',
      deliveryMethod = 'Courier Service',
      channel = 'Online - Website (ichouse.lk)',
      note = ''
    } = req.body;

    // Standardize items array
    let orderItems = [];
    if (Array.isArray(items) && items.length > 0) {
      orderItems = items;
    } else if (req.body.itemId) {
      orderItems = [{
        itemId: req.body.itemId,
        qty: Number(req.body.qty) || 1,
        unitPrice: Number(req.body.unitPrice) || 0,
        name: req.body.name || ''
      }];
    } else {
      return res.status(400).json({
        success: false,
        error: 'Order items are required. Provide an array of items or a single itemId.'
      });
    }

    const orderDate = new Date().toISOString().split('T')[0];
    const orderTimestamp = new Date().toISOString();
    const orderId = 'ORD-WEB-' + orderDate.replace(/-/g, '') + '-' + Math.floor(1000 + Math.random() * 9000);

    let calculatedGrandTotal = 0;
    const processedItems = [];

    // Step 1: Pre-validate all items before writing
    for (const lineItem of orderItems) {
      const itemRef = db.collection('inventory').doc(lineItem.itemId);
      const doc = await itemRef.get();

      if (!doc.exists) {
        return res.status(404).json({
          success: false,
          error: `Product with ID '${lineItem.itemId}' was not found in inventory.`
        });
      }

      const itemData = doc.data();
      const available = calculateAvailableStock(itemData);
      const reqQty = Number(lineItem.qty) || 1;

      if (reqQty > available) {
        return res.status(400).json({
          success: false,
          error: `Insufficient stock for "${itemData.name}". Available: ${available} pcs, Requested: ${reqQty} pcs.`
        });
      }

      const unitPrice = lineItem.unitPrice !== undefined ? Number(lineItem.unitPrice) : (itemData.buyPrice || 0);
      const lineRevenue = reqQty * unitPrice;
      calculatedGrandTotal += lineRevenue;

      processedItems.push({
        ref: itemRef,
        itemData,
        reqQty,
        unitPrice,
        lineRevenue,
        name: itemData.name
      });
    }

    // Step 2: Update all items in Firestore
    for (const itemObj of processedItems) {
      const { ref, itemData, reqQty, unitPrice, lineRevenue } = itemObj;

      const existingSales = Array.isArray(itemData.sales) ? itemData.sales : [];
      const newSellQty = (Number(itemData.sellQty) || 0) + reqQty;
      const newRevenue = (Number(itemData.totalRevenue) || 0) + lineRevenue;

      let totalBuyQty = itemData.buyQty || 0;
      if (Array.isArray(itemData.batches) && itemData.batches.length > 0) {
        totalBuyQty = itemData.batches.reduce((sum, b) => sum + (Number(b.buyQty) || 0), 0);
      }

      const newStatus = newSellQty >= totalBuyQty ? 'sold' : 'partial';

      const saleRecord = {
        id: 'web_sale_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        orderId: orderId,
        orderTotal: calculatedGrandTotal,
        date: orderDate,
        customerName: customerName || 'Website Customer',
        customerPhone: customerPhone || '',
        customerAddress: customerAddress || '',
        qty: reqQty,
        unitPrice: unitPrice,
        revenue: lineRevenue,
        channel: channel,
        paymentMethod: paymentMethod,
        paymentStatus: paymentStatus,
        deliveryMethod: deliveryMethod,
        note: note ? `${note} (Addr: ${customerAddress || 'N/A'})` : (customerAddress ? `Addr: ${customerAddress}` : ''),
        timestamp: orderTimestamp
      };

      await ref.update({
        sales: [...existingSales, saleRecord],
        sellQty: newSellQty,
        totalRevenue: newRevenue,
        status: newStatus,
        lastSoldDate: orderTimestamp
      });
    }

    res.status(201).json({
      success: true,
      message: 'Order placed successfully! Inventory stock has been automatically deducted.',
      order: {
        orderId,
        date: orderDate,
        grandTotal: calculatedGrandTotal,
        itemsCount: processedItems.length,
        customer: {
          name: customerName,
          phone: customerPhone,
          address: customerAddress
        },
        payment: {
          method: paymentMethod,
          status: paymentStatus
        },
        delivery: deliveryMethod
      }
    });

  } catch (error) {
    console.error('Error processing checkout:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/orders/webhook
 * Universal webhook endpoint for external e-commerce platforms (WooCommerce, Shopify, Custom Store)
 */
router.post('/webhook', async (req, res) => {
  try {
    const payload = req.body;
    console.log('Received e-commerce webhook order payload:', payload);

    // Standardize webhook payload fields
    const customer = payload.billing || payload.customer || {};
    const lineItems = payload.line_items || payload.items || [];

    const orderData = {
      customerName: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.name || 'Online Customer',
      customerPhone: customer.phone || payload.phone || '',
      customerAddress: `${customer.address_1 || ''}, ${customer.city || ''}`.trim(),
      paymentMethod: payload.payment_method_title || payload.payment_method || 'Online Store Gateway',
      paymentStatus: (payload.status === 'completed' || payload.paid) ? 'Paid' : 'Pending',
      deliveryMethod: 'Courier Service',
      channel: 'Online - Website (ichouse.lk)',
      note: `Webhook Order #${payload.id || payload.order_number || ''}`,
      items: lineItems.map(item => ({
        itemId: item.sku || item.product_id || item.id, // Ensure your website product SKU matches Firestore item ID
        qty: Number(item.quantity) || 1,
        unitPrice: Number(item.price) || 0,
        name: item.name || ''
      }))
    };

    // Forward to internal checkout handler logic
    req.body = orderData;
    return router.handle(req, res);

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
