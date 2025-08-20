import { supabase } from './supabase';

interface ProductFilter {
  material?: string;
  minPrice?: number;
  maxPrice?: number;
  design?: string;
  width?: number;
  stones?: boolean;
}

export class ProductRecommendations {
  private static instance: ProductRecommendations;

  private constructor() {}

  static getInstance(): ProductRecommendations {
    if (!ProductRecommendations.instance) {
      ProductRecommendations.instance = new ProductRecommendations();
    }
    return ProductRecommendations.instance;
  }

  async getRecommendations(
    tenantId: string,
    filters: ProductFilter,
    limit: number = 3
  ): Promise<any[]> {
    try {
      let query = supabase
        .from('product_models')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('availability', true);

      // Apply filters
      if (filters.material) {
        query = query.eq('material', filters.material);
      }

      if (filters.minPrice) {
        query = query.gte('price', filters.minPrice);
      }

      if (filters.maxPrice) {
        query = query.lte('price', filters.maxPrice);
      }

      if (filters.design) {
        query = query.contains('features', { design: filters.design });
      }

      if (filters.width) {
        query = query.contains('features', { width: `${filters.width}mm` });
      }

      if (filters.stones !== undefined) {
        if (filters.stones) {
          query = query.contains('features', { stones: 'diamantes naturais' });
        } else {
          query = query.not('features', 'cs-', { stones: 'diamantes naturais' });
        }
      }

      const { data, error } = await query.limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting product recommendations:', error);
      return [];
    }
  }

  async analyzeMessage(message: string): Promise<any> {
    // Extract preferences from message
    const preferences = await this.extractPreferences(message);
    
    // Get tenant ID (in a real app, this would come from context)
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', 'zaffira')
      .single();
    
    if (!tenant) return null;
    
    // Get recommendations based on preferences
    const recommendations = await this.getRecommendations(
      tenant.id,
      preferences,
      3
    );
    
    return {
      preferences,
      recommendations
    };
  }

  private async extractPreferences(message: string): Promise<ProductFilter> {
    const preferences: ProductFilter = {};

    // Extract material preferences
    const materialMatches = message
      .toLowerCase()
      .match(/ouro (amarelo|branco|rosé)/g);
    
    if (materialMatches?.length) {
      const material = materialMatches[materialMatches.length - 1];
      preferences.material = `Ouro ${material.split(' ')[1].charAt(0).toUpperCase() + material.split(' ')[1].slice(1)} 18k`;
    }

    // Extract price range
    const priceMatches = message
      .match(/R\$\s*[\d,.]+/g);
    
    if (priceMatches?.length) {
      const prices = priceMatches.map(p => 
        parseFloat(p.replace('R$', '').replace(/\./g, '').replace(',', '.'))
      );
      preferences.minPrice = Math.min(...prices) * 0.8; // 20% below mentioned price
      preferences.maxPrice = Math.max(...prices) * 1.2; // 20% above mentioned price
    }

    // Extract design preferences
    const designKeywords = {
      tradicional: ['tradicional', 'clássica', 'clássico', 'simples'],
      anatômico: ['anatômica', 'anatômico', 'confortável', 'conforto'],
      sofisticado: ['sofisticada', 'sofisticado', 'elegante', 'detalhes'],
      premium: ['premium', 'luxo', 'luxuosa', 'exclusiva']
    };

    const content = message.toLowerCase();
    for (const [design, keywords] of Object.entries(designKeywords)) {
      if (keywords.some(k => content.includes(k))) {
        preferences.design = design;
        break;
      }
    }

    // Extract width preferences
    const widthMatch = content.match(/(\d+)\s*mm/);
    if (widthMatch) {
      preferences.width = parseInt(widthMatch[1]);
    }

    // Check for stone preferences
    preferences.stones = content.includes('diamante') || content.includes('pedra');

    return preferences;
  }

  async formatProductMessage(products: any[]): Promise<string> {
    if (!products.length) {
      return 'Desculpe, não encontrei produtos que correspondam exatamente aos seus critérios. Que tal me contar mais sobre o que você procura? 😊';
    }

    let message = 'Encontrei algumas opções que podem te interessar! ✨\n\n';

    products.forEach((product, index) => {
      message += `${index + 1}. ${product.name}\n`;
      message += `• Material: ${product.material}\n`;
      message += `• ${product.description}\n`;
      message += `• Investimento: R$ ${product.price.toFixed(2)}\n\n`;
    });

    message += 'Gostaria de ver mais detalhes de alguma dessas opções? 💎';

    return message;
  }
}