export interface ProductVariation {
  id: string;
  material: string;
  format: string;
  width: number;
  weight: number;
  price: number;
}

export interface Product {
  id: string;
  tenantId: string;
  name: string;
  category: string;
  variations: ProductVariation[];
  customizable: boolean;
  deliveryTime?: string;
  warranty?: string;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}