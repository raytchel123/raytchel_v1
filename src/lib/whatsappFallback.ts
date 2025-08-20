export interface InteractiveButton {
  id: string;
  title: string;
}

export interface InteractiveList {
  title: string;
  rows: Array<{
    id: string;
    title: string;
    description?: string;
  }>;
}

export class WhatsAppFallbackService {
  
  static generateButtonFallback(text: string, buttons: InteractiveButton[]): string {
    let message = text + "\n\n";
    
    buttons.forEach((button, index) => {
      message += `${index + 1}️⃣ ${button.title}\n`;
    });
    
    message += "\nDigite o número da opção desejada.";
    return message;
  }
  
  static generateListFallback(text: string, list: InteractiveList): string {
    let message = text + "\n\n";
    message += `📋 **${list.title}**\n\n`;
    
    list.rows.forEach((row, index) => {
      message += `${index + 1}️⃣ ${row.title}`;
      if (row.description) {
        message += ` - ${row.description}`;
      }
      message += "\n";
    });
    
    message += "\nDigite o número da opção desejada.";
    return message;
  }
  
  static parseNumberResponse(message: string, optionsCount: number): number | null {
    const num = parseInt(message.trim());
    if (num >= 1 && num <= optionsCount) {
      return num - 1; // Retorna índice (0-based)
    }
    return null;
  }

  static generateLocationFallback(name: string, address: string, phone?: string): string {
    let message = `📍 **${name}**\n\n`;
    message += `📧 Endereço: ${address}\n`;
    if (phone) {
      message += `📞 Telefone: ${phone}\n`;
    }
    message += "\n🗺️ Abrir no Google Maps: https://maps.google.com/?q=" + encodeURIComponent(address);
    message += "\n\nO que gostaria de fazer agora?\n\n";
    message += "1️⃣ Agendar visita\n";
    message += "2️⃣ Ver catálogo\n";
    message += "3️⃣ Falar com atendente\n";
    message += "\nDigite o número da opção desejada.";
    
    return message;
  }

  static generatePaymentFallback(totalValue: number): string {
    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value);
    };

    let message = `💳 **Formas de Pagamento**\n\n`;
    message += `Valor total: ${formatCurrency(totalValue)}\n\n`;
    message += `1️⃣ PIX à vista (5% desconto): ${formatCurrency(totalValue * 0.95)}\n`;
    message += `2️⃣ Cartão em até 12x sem juros: ${formatCurrency(totalValue / 12)}/mês\n`;
    message += `3️⃣ Entrada + saldo: Condições especiais\n\n`;
    message += "Digite o número da opção desejada.";
    
    return message;
  }

  static generateAppointmentFallback(slots: any[]): string {
    let message = "📅 **Horários Disponíveis**\n\n";
    message += "Escolha o melhor horário para sua visita:\n\n";
    
    slots.forEach((slot, index) => {
      message += `${index + 1}️⃣ ${slot.title}`;
      if (slot.description) {
        message += ` - ${slot.description}`;
      }
      message += "\n";
    });
    
    message += "\nDigite o número da opção desejada.";
    return message;
  }

  static generateCatalogFallback(products: any[]): string {
    let message = "💎 **Catálogo Zaffira**\n\n";
    
    products.forEach((product, index) => {
      message += `${index + 1}️⃣ ${product.name}`;
      if (product.price) {
        message += ` - ${new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(product.price)}`;
      }
      message += "\n";
    });
    
    message += "\nDigite o número para ver detalhes.";
    return message;
  }
}