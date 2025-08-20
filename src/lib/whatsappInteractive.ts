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

export interface InteractiveResponse {
  type: 'button' | 'list';
  button_reply?: {
    id: string;
    title: string;
  };
  list_reply?: {
    id: string;
    title: string;
    description?: string;
  };
}

export class WhatsAppInteractiveService {
  private token: string;
  private phoneNumberId: string;

  constructor(token: string, phoneNumberId: string) {
    this.token = token;
    this.phoneNumberId = phoneNumberId;
  }

  async sendButtons(to: string, text: string, buttons: InteractiveButton[]): Promise<boolean> {
    const payload = {
      messaging_product: "whatsapp",
      to: to,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text },
        action: {
          buttons: buttons.slice(0, 3).map(btn => ({
            type: "reply",
            reply: { id: btn.id, title: btn.title.substring(0, 20) }
          }))
        }
      }
    };
    
    return await this.sendToWhatsApp(payload);
  }
  
  async sendList(to: string, text: string, buttonText: string, list: InteractiveList): Promise<boolean> {
    const payload = {
      messaging_product: "whatsapp",
      to: to,
      type: "interactive",
      interactive: {
        type: "list",
        body: { text },
        action: {
          button: buttonText,
          sections: [{
            title: list.title,
            rows: list.rows.slice(0, 10).map(row => ({
              id: row.id,
              title: row.title.substring(0, 24),
              description: row.description?.substring(0, 72)
            }))
          }]
        }
      }
    };
    
    return await this.sendToWhatsApp(payload);
  }

  async sendLocationButton(to: string, text: string, latitude: number, longitude: number, name: string, address: string): Promise<boolean> {
    const payload = {
      messaging_product: "whatsapp",
      to: to,
      type: "location",
      location: {
        latitude: latitude,
        longitude: longitude,
        name: name,
        address: address
      }
    };
    
    return await this.sendToWhatsApp(payload);
  }

  private async sendToWhatsApp(payload: any): Promise<boolean> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        }
      );

      const result = await response.json();
      
      if (response.ok) {
        console.log('Interactive message sent successfully:', result);
        return true;
      } else {
        console.error('Error sending interactive message:', result);
        return false;
      }
    } catch (error) {
      console.error('Error in sendToWhatsApp:', error);
      return false;
    }
  }

  // Método para processar respostas interativas
  static parseInteractiveResponse(message: any): InteractiveResponse | null {
    if (message.type === 'interactive') {
      if (message.interactive.type === 'button_reply') {
        return {
          type: 'button',
          button_reply: {
            id: message.interactive.button_reply.id,
            title: message.interactive.button_reply.title
          }
        };
      } else if (message.interactive.type === 'list_reply') {
        return {
          type: 'list',
          list_reply: {
            id: message.interactive.list_reply.id,
            title: message.interactive.list_reply.title,
            description: message.interactive.list_reply.description
          }
        };
      }
    }
    return null;
  }

  // Zaffira-specific interactive flows
  async sendJewelryTypeSelector(to: string): Promise<boolean> {
    return await this.sendButtons(to, 
      "Que tipo de joia você está procurando? 💎", 
      [
        { id: "aliancas", title: "💍 Alianças" },
        { id: "aneis", title: "💎 Anéis" },
        { id: "outros", title: "✨ Outras Joias" }
      ]
    );
  }

  async sendMaterialSelector(to: string, jewelryType: string): Promise<boolean> {
    return await this.sendButtons(to,
      `Qual material você prefere para ${jewelryType}? ✨`,
      [
        { id: "ouro_amarelo", title: "🟡 Ouro Amarelo 18k" },
        { id: "ouro_branco", title: "⚪ Ouro Branco 18k" },
        { id: "ouro_rose", title: "🌹 Ouro Rosé 18k" }
      ]
    );
  }

  async sendAllianceOptions(to: string): Promise<boolean> {
    return await this.sendList(to,
      "Escolha o modelo de aliança que mais combina com vocês:",
      "Ver Detalhes",
      {
        title: "Modelos de Alianças",
        rows: [
          {
            id: "florida_tradicional",
            title: "Florida Tradicional",
            description: "4mm - R$ 3.465 o par"
          },
          {
            id: "florida_anatomica",
            title: "Florida Anatômica", 
            description: "4mm - R$ 3.700 o par"
          },
          {
            id: "florida_super",
            title: "Florida Super Anatômica",
            description: "4mm - R$ 3.900 o par"
          },
          {
            id: "classica_5mm",
            title: "Clássica 5mm",
            description: "5mm - R$ 4.100 o par"
          },
          {
            id: "premium_diamond",
            title: "Premium com Diamantes",
            description: "4mm - R$ 4.500 o par"
          }
        ]
      }
    );
  }

  async sendPaymentOptions(to: string, totalValue: number): Promise<boolean> {
    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value);
    };

    return await this.sendButtons(to,
      `Como você gostaria de realizar o pagamento de ${formatCurrency(totalValue)}? 💳`,
      [
        { id: "pix_desconto", title: "💚 PIX (5% desconto)" },
        { id: "cartao_12x", title: "💳 12x sem juros" },
        { id: "entrada_saldo", title: "💰 Entrada + Saldo" }
      ]
    );
  }

  async sendAppointmentSlots(to: string, availableSlots: any[]): Promise<boolean> {
    const slots = availableSlots.slice(0, 10).map(slot => ({
      id: `slot_${slot.id}`,
      title: slot.date,
      description: `${slot.time} - ${slot.duration}`
    }));

    return await this.sendList(to,
      "Escolha o melhor horário para sua visita à nossa loja:",
      "Agendar",
      {
        title: "Horários Disponíveis",
        rows: slots
      }
    );
  }

  async sendCustomizationOptions(to: string, jewelryType: string): Promise<boolean> {
    const options = this.getCustomizationOptions(jewelryType);
    
    return await this.sendList(to,
      `Que personalização você gostaria para ${jewelryType}?`,
      "Escolher",
      {
        title: "Opções de Personalização",
        rows: options
      }
    );
  }

  async sendServiceOptions(to: string): Promise<boolean> {
    return await this.sendButtons(to,
      "Olá! Bem-vindo(a) à Zaffira! ✨\n\nSomos especializados em joias personalizadas de alta qualidade. Como posso te ajudar hoje?",
      [
        { id: "ver_valores", title: "💎 Ver Valores" },
        { id: "agendar", title: "📅 Agendar Visita" },
        { id: "localizacao", title: "📍 Localização" }
      ]
    );
  }

  private getCustomizationOptions(jewelryType: string): Array<{id: string, title: string, description: string}> {
    switch (jewelryType) {
      case 'aliança':
        return [
          { id: "gravacao", title: "Gravação", description: "Nomes, data ou símbolo" },
          { id: "acabamento", title: "Acabamento", description: "Polido, fosco ou escovado" },
          { id: "diamantes", title: "Diamantes", description: "Cravação de pedras" },
          { id: "largura", title: "Largura", description: "3mm a 8mm disponível" }
        ];
      case 'anel':
        return [
          { id: "pedra_central", title: "Pedra Central", description: "Diamante ou pedra colorida" },
          { id: "cravacao", title: "Cravação", description: "Estilo da montagem" },
          { id: "gravacao", title: "Gravação", description: "Mensagem personalizada" }
        ];
      default:
        return [
          { id: "gravacao", title: "Gravação", description: "Personalização especial" },
          { id: "acabamento", title: "Acabamento", description: "Estilo de finalização" }
        ];
    }
  }
}