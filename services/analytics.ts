
import { ProductSlot, Transaction } from "../types";

/**
 * Predicts when a slot will be empty based on sales velocity.
 * Formula: Remaining Hours = CurrentStock / (Sales in last X hours / X hours)
 */
export const predictStockout = (slot: ProductSlot, transactions: Transaction[]): { hoursRemaining: number, status: string } => {
  if (slot.currentStock === 0) return { hoursRemaining: 0, status: 'Empty' };

  // 1. Get transactions for this slot in the last 24 hours
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
  
  const recentSales = transactions.filter(t => 
    t.slotId === slot.id && 
    new Date(t.timestamp) > oneDayAgo &&
    t.status === 'SUCCESS'
  ).length;

  if (recentSales === 0) return { hoursRemaining: 999, status: 'Safe' };

  const salesPerHour = recentSales / 24;
  const hoursRemaining = slot.currentStock / salesPerHour;

  let status = 'Safe';
  if (hoursRemaining < 4) status = 'Critical';
  else if (hoursRemaining < 12) status = 'Warning';

  return { hoursRemaining, status };
};

/**
 * Identifies opportunities for Dynamic Pricing (Surge).
 * Trigger: If > 5 sales of a specific item in the last hour.
 */
export const checkSurgePricing = (transactions: Transaction[]): { slotId: string, reason: string, suggestedIncrease: number }[] => {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - (60 * 60 * 1000));
  
  const recentTransactions = transactions.filter(t => 
    new Date(t.timestamp) > oneHourAgo && 
    t.status === 'SUCCESS'
  );

  // Count sales per slot
  const salesMap: Record<string, number> = {};
  recentTransactions.forEach(t => {
    salesMap[t.slotId] = (salesMap[t.slotId] || 0) + 1;
  });

  const suggestions = [];

  for (const [slotId, count] of Object.entries(salesMap)) {
    if (count >= 5) {
      suggestions.push({
        slotId,
        reason: `High Demand: ${count} units sold in last hour`,
        suggestedIncrease: 0.20 // Suggest 20 cent increase
      });
    }
  }

  return suggestions;
};
