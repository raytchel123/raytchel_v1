export interface Material {
  id: string;
  name: string;
  type: 'metal' | 'stone';
  unit: 'gram' | 'unit';
  basePrice: number;
  currentPrice?: number;
  lastUpdate: Date;
}

export interface Stone {
  id: string;
  type: string;
  format: string;
  size: string;
  pricePerUnit: number;
}

export interface BudgetItem {
  productId?: string;
  type: 'catalog' | 'custom';
  metalType: string;
  weight: number;
  stones?: {
    type: string;
    quantity: number;
    size: string;
  }[];
  engraving?: boolean;
  referenceImages?: string[];
}

export interface BudgetCalculation {
  baseCost: number;
  laborCost: number;
  stoneCost: number;
  logisticsCost: number;
  engravingCost: number;
  subtotal: number;
  taxes: number;
  cardFee?: number;
  discount?: number;
  total: number;
  margin: number;
}

export interface Budget {
  id: string;
  tenantId: string;
  clientId?: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  items: BudgetItem[];
  calculation: BudgetCalculation;
  paymentMethod?: 'cash' | 'card_present' | 'card_link';
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  priority: 'normal' | 'rush';
  estimatedDelivery: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}