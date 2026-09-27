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
 * GET /api/products
 * Public endpoint to fetch all products for website storefront with live stock availability
 * Optional Query Params:
 *  - inStockOnly=true (Filter only items with stock > 0)
 *  - category=Electronics (Filter by category)
 *  - search=keyword (Search item name, category, shop)
 */
router.get('/', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not initialized' });
    }

    const snapshot = await db.collection('inventory').orderBy('date', 'desc').get();
    let products = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      const availableStock = calculateAvailableStock(data);

      products.push({
        id: doc.id,
        name: data.name || '',
        category: data.category || 'General',
        shop: data.shop || '',
        buyPrice: data.buyPrice || 0,
        // Suggested selling price: from last sale or retail markup, fallback to buyPrice
        sellPrice: (data.sales && data.sales.length > 0) ? (data.sales[data.sales.length - 1].unitPrice || data.buyPrice) : data.buyPrice,
        availableStock: availableStock,
        isInStock: availableStock > 0,
        photos: data.photos || [],
        date: data.date || ''
      });
    });

    const { inStockOnly, category, search } = req.query;

    if (inStockOnly === 'true') {
      products = products.filter(p => p.isInStock);
    }

    if (category) {
      products = products.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }

    if (search) {
      const q = search.toLowerCase().trim();
      products = products.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.category.toLowerCase().includes(q) || 
        p.shop.toLowerCase().includes(q)
      );
    }

    res.json({
      success: true,
      count: products.length,
      products
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/products/:id
 * Check real-time stock and details for a single product by Firestore ID
 */
router.get('/:id', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not initialized' });

    const docRef = db.collection('inventory').doc(req.params.id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const data = doc.data();
    const availableStock = calculateAvailableStock(data);

    res.json({
      success: true,
      product: {
        id: doc.id,
        name: data.name,
        category: data.category || 'General',
        shop: data.shop || '',
        buyPrice: data.buyPrice || 0,
        sellPrice: (data.sales && data.sales.length > 0) ? (data.sales[data.sales.length - 1].unitPrice || data.buyPrice) : data.buyPrice,
        availableStock: availableStock,
        isInStock: availableStock > 0,
        photos: data.photos || [],
        date: data.date
      }
    });
  } catch (error) {
    console.error('Error fetching product by ID:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/products
 * Add new stock item to inventory (Admin endpoint)
 */
router.post('/', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not initialized' });

    const { name, shop, buyQty, buyPrice, category, date, photos } = req.body;

    if (!name || !buyQty || buyPrice === undefined) {
      return res.status(400).json({ success: false, error: 'Missing required fields: name, buyQty, buyPrice' });
    }

    const itemDate = date || new Date().toISOString().split('T')[0];
    const qty = parseInt(buyQty, 10);
    const price = parseFloat(buyPrice);

    const docRef = await db.collection('inventory').add({
      name,
      shop: shop || '',
      buyQty: qty,
      buyPrice: price,
      category: category || 'General',
      sellQty: 0,
      totalRevenue: 0,
      costCOD: 0,
      costPacking: 0,
      costDefect: 0,
      costOther: 0,
      status: 'in_stock',
      date: itemDate,
      batches: [{ shop: shop || '', buyQty: qty, buyPrice: price, date: itemDate }],
      photos: Array.isArray(photos) ? photos : [],
      sales: [],
      timestamp: new Date().toISOString()
    });

    res.status(201).json({
      success: true,
      message: 'Product added successfully to inventory',
      id: docRef.id
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
