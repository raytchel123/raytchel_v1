import { BudgetItem, BudgetCalculation } from '../types/budget';

export class BudgetCalculator {
  private static instance: BudgetCalculator;
  
  private readonly LABOR_COST_PER_GRAM = 50;
  private readonly STONE_SETTING_COST = 8;
  private readonly LOGISTICS_COST = 20;
  private readonly ENGRAVING_COST = 20;
  private readonly TAX_RATE = 0.089;
  private readonly CARD_PRESENT_FEE = 0.105;
  private readonly CARD_LINK_FEE = 0.175;
  private readonly TARGET_MARGIN = 0.30;

  private constructor() {}

  static getInstance(): BudgetCalculator {
    if (!BudgetCalculator.instance) {
      BudgetCalculator.instance = new BudgetCalculator();
    }
    return BudgetCalculator.instance;
  }

  calculateBudget(
    items: BudgetItem[],
    paymentMethod?: 'cash' | 'card_present' | 'card_link',
    cashDiscount: number = 0.05
  ): BudgetCalculation {
    let baseCost = 0;
    let laborCost = 0;
    let stoneCost = 0;
    let logisticsCost = this.LOGISTICS_COST;
    let engravingCost = 0;

    // Calculate costs for each item
    items.forEach(item => {
      // Metal cost
      const metalCost = this.calculateMetalCost(item.metalType, item.weight);
      baseCost += metalCost;

      // Labor cost
      laborCost += item.weight * this.LABOR_COST_PER_GRAM;

      // Stone cost
      if (item.stones?.length) {
        const itemStoneCost = this.calculateStoneCost(item.stones);
        stoneCost += itemStoneCost;
        // Add stone setting cost
        laborCost += item.stones.reduce((total, stone) => 
          total + (stone.quantity * this.STONE_SETTING_COST), 0);
      }

      // Engraving cost
      if (item.engraving) {
        engravingCost += this.ENGRAVING_COST;
      }
    });

    // Calculate subtotal
    const subtotal = baseCost + laborCost + stoneCost + logisticsCost + engravingCost;

    // Calculate taxes
    const taxes = subtotal * this.TAX_RATE;

    // Calculate card fees if applicable
    let cardFee = 0;
    if (paymentMethod === 'card_present') {
      cardFee = subtotal * this.CARD_PRESENT_FEE;
    } else if (paymentMethod === 'card_link') {
      cardFee = subtotal * this.CARD_LINK_FEE;
    }

    // Calculate discount for cash payment
    let discount = 0;
    if (paymentMethod === 'cash') {
      discount = subtotal * cashDiscount;
    }

    // Calculate total with margin
    const costWithTaxes = subtotal + taxes + cardFee - discount;
    const total = costWithTaxes / (1 - this.TARGET_MARGIN);
    const margin = (total - costWithTaxes) / total;

    return {
      baseCost,
      laborCost,
      stoneCost,
      logisticsCost,
      engravingCost,
      subtotal,
      taxes,
      cardFee,
      discount,
      total,
      margin
    };
  }

  private calculateMetalCost(metalType: string, weight: number): number {
    // TODO: Get real metal prices from database
    const pricePerGram = {
      'ouro_amarelo': 310,
      'ouro_branco': 320,
      'ouro_rose': 315
    }[metalType] || 310;

    return weight * pricePerGram;
  }

  private calculateStoneCost(stones: { type: string; quantity: number; size: string; }[]): number {
    // TODO: Get real stone prices from database
    const pricePerStone = {
      'diamante_1.3mm': 75,
      'diamante_2mm': 120,
      'esmeralda_4x6mm': 450
    };

    return stones.reduce((total, stone) => {
      const price = pricePerStone[`${stone.type}_${stone.size}`] || 75;
      return total + (price * stone.quantity);
    }, 0);
  }

  estimateDeliveryDate(items: BudgetItem[], priority: 'normal' | 'rush'): Date {
    const baseDeliveryDays = items.some(item => item.type === 'custom') ? 15 : 10;
    const rushReduction = priority === 'rush' ? 5 : 0;
    
    const deliveryDays = baseDeliveryDays - rushReduction;
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + deliveryDays);
    
    return deliveryDate;
  }
}