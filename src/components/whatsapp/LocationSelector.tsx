import React from 'react';
import { X, MapPin, Clock, Phone } from 'lucide-react';

interface LocationSelectorProps {
  onSelect: (location: any) => void;
  onClose: () => void;
}

export function LocationSelector({ onSelect, onClose }: LocationSelectorProps) {
  const locations = [
    {
      id: 1,
      name: 'Zaffira Joalheria - Loja Principal',
      address: 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP, 01310-100',
      hours: 'Segunda a Sábado: 10h às 20h\nDomingo: 14h às 18h',
      phone: '(11) 3333-4444',
      image: 'https://images.unsplash.com/photo-1600585152220-90363fe7e115?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60'
    },
    {
      id: 2,
      name: 'Zaffira Joalheria - Shopping Ibirapuera',
      address: 'Av. Ibirapuera, 3103 - Indianópolis, São Paulo - SP, 04029-902',
      hours: 'Segunda a Sábado: 10h às 22h\nDomingo: 14h às 20h',
      phone: '(11) 3333-5555',
      image: 'https://images.unsplash.com/photo-1604014237800-1c9102c219da?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-medium flex items-center">
            <MapPin className="w-5 h-5 mr-2 text-indigo-600" />
            Nossas Lojas
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Locations */}
        <div className="p-4 space-y-4">
          {locations.map((location) => (
            <div 
              key={location.id} 
              className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onSelect(location)}
            >
              <div className="md:flex">
                <div className="md:w-1/3 h-48 md:h-auto">
                  <img 
                    src={location.image} 
                    alt={location.name} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4 md:w-2/3">
                  <h4 className="font-medium">{location.name}</h4>
                  <div className="mt-2 space-y-2 text-sm text-gray-600">
                    <p className="flex items-start">
                      <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                      <span>{location.address}</span>
                    </p>
                    <p className="flex items-start">
                      <Clock className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="whitespace-pre-line">{location.hours}</span>
                    </p>
                    <p className="flex items-center">
                      <Phone className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span>{location.phone}</span>
                    </p>
                  </div>
                  <button 
                    className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(location);
                    }}
                  >
                    Enviar Localização
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}