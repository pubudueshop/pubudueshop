import express from 'express';
import { db } from '../firebase.js';

const router = express.Router();

/**
 * GET /api/analytics/summary
 * Live Financial & Inventory Health API
 * Provides:
 * - Total Inventory Investment (Rs)
 * - Total Sales Revenue (Rs)
 * - Cost of Goods Sold (COGS)
 * - Additional & Operational Costs (Rs)
 * - Net Profit & Margins
 * - Low stock alert list
 */
router.get('/summary', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not initialized' });

    const [invSnapshot, expSnapshot] = await Promise.all([
      db.collection('inventory').get(),
      db.collection('expenses').get()
    ]);

    let totalInvestment = 0;
    let totalRevenue = 0;
    let costOfGoodsSold = 0;
    let totalItemCosts = 0;
    let totalItemsCount = 0;
    let totalStockPcs = 0;
    const lowStockAlerts = [];

    invSnapshot.forEach(doc => {
      const item = doc.data();
      totalItemsCount++;

      let itemBuyQty = item.buyQty || 0;
      let itemInvestment = 0;

      const batches = Array.isArray(item.batches) && item.batches.length > 0 ? item.batches : [{
        buyQty: item.buyQty || 0,
        buyPrice: item.buyPrice || 0,
        date: item.date || ''
      }];

      batches.forEach(b => {
        itemInvestment += (Number(b.buyQty) || 0) * (Number(b.buyPrice) || 0);
      });

      totalInvestment += itemInvestment;

      const itemCosts = (Number(item.costCOD) || 0) + (Number(item.costPacking) || 0) + (Number(item.costDefect) || 0) + (Number(item.costOther) || 0);
      totalItemCosts += itemCosts;

      const sellQty = Number(item.sellQty) || 0;
      const totalBuy = batches.reduce((sum, b) => sum + (Number(b.buyQty) || 0), 0);
      const availableStock = Math.max(0, totalBuy - sellQty);
      totalStockPcs += availableStock;

      if (availableStock <= 2) {
        lowStockAlerts.push({
          id: doc.id,
          name: item.name,
          category: item.category || 'General',
          availableStock,
          status: availableStock === 0 ? 'Out of Stock' : 'Low Stock'
        });
      }

      if (sellQty > 0) {
        totalRevenue += (Number(item.totalRevenue) || 0);

        // Calculate FIFO COGS
        let remainingSell = sellQty;
        const sortedBatches = [...batches].sort((a, b) => new Date(a.date) - new Date(b.date));
        for (const b of sortedBatches) {
          if (remainingSell <= 0) break;
          const qtyFromBatch = Math.min(Number(b.buyQty) || 0, remainingSell);
          costOfGoodsSold += (qtyFromBatch * (Number(b.buyPrice) || 0));
          remainingSell -= qtyFromBatch;
        }
      }
    });

    let standaloneExpenses = 0;
    expSnapshot.forEach(doc => {
      standaloneExpenses += (Number(doc.data().amount) || 0);
    });

    const totalOperationalCosts = totalItemCosts + standaloneExpenses;
    const grossProfit = totalRevenue - costOfGoodsSold;
    const netProfit = grossProfit - totalOperationalCosts;
    const grossMarginPct = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : 0;
    const netMarginPct = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;

    res.json({
      success: true,
      data: {
        totalItemsCount,
        totalStockPcs,
        financials: {
          totalInvestment,
          totalRevenue,
          costOfGoodsSold,
          grossProfit,
          grossMarginPct: Number(grossMarginPct),
          totalOperationalCosts,
          netProfit,
          netMarginPct: Number(netMarginPct)
        },
        lowStockAlerts
      }
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
