import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  User, 
  Phone,
  CheckCircle,
  AlertCircle,
  Plus,
  Filter,
  Search,
  MapPin
} from 'lucide-react';
import { useMVPStore } from '../../stores/mvpStore';
import { formatDistanceToNow } from '../../utils/dateFormat';
import { PageHeader } from '../common/PageHeader';

export function AppointmentManager() {
  const { 
    availableSlots, 
    bookedAppointments, 
    loadAvailableSlots, 
    bookAppointment,
    loading,
    error 
  } = useMVPStore();

  const [selectedDate, setSelectedDate] = useState('');
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [bookingData, setBookingData] = useState({
    contact_name: '',
    contact_phone: '',
    service_type: 'consulta_joias',
    notes: ''
  });

  useEffect(() => {
    loadAvailableSlots();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      loadAvailableSlots(selectedDate);
    }
  }, [selectedDate]);

  const handleBookAppointment = async () => {
    if (!selectedSlot || !bookingData.contact_name || !bookingData.contact_phone) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    const success = await bookAppointment({
      contact_id: bookingData.contact_phone,
      contact_name: bookingData.contact_name,
      contact_phone: bookingData.contact_phone,
      slot_date: selectedSlot.slot_date,
      slot_time: selectedSlot.slot_time,
      service_type: bookingData.service_type
    });

    if (success) {
      setShowBookingForm(false);
      setSelectedSlot(null);
      setBookingData({
        contact_name: '',
        contact_phone: '',
        service_type: 'consulta_joias',
        notes: ''
      });
      alert('Agendamento realizado com sucesso!');
    }
  };

  const generateAvailableDates = () => {
    const dates = [];
    for (let i = 0; i < 14; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      weekday: 'short'
    });
  };

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5);
  };

  const getServiceTypeLabel = (type: string) => {
    switch (type) {
      case 'consulta_joias': return 'Consulta de Joias';
      case 'medicao_aro': return 'Medição de Aro';
      case 'manutencao': return 'Manutenção';
      case 'entrega': return 'Entrega';
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gerenciamento de Agendamentos"
        subtitle="Gerencie visitas e consultas na loja"
        icon={<Calendar className="w-6 h-6 text-indigo-600" />}
        actions={
          <div className="flex items-center space-x-3">
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Todas as datas</option>
              {generateAvailableDates().map(date => (
                <option key={date} value={date}>
                  {formatDate(date)}
                </option>
              ))}
            </select>
          </div>
        }
        showBackButton={true}
        backTo="/mvp"
      />

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <Calendar className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Disponíveis</p>
              <p className="text-xl font-bold">{availableSlots.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Agendados</p>
              <p className="text-xl font-bold">{bookedAppointments.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Hoje</p>
              <p className="text-xl font-bold">
                {availableSlots.filter(slot => 
                  slot.slot_date === new Date().toISOString().split('T')[0]
                ).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-50 rounded-lg">
              <MapPin className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Taxa Comparecimento</p>
              <p className="text-xl font-bold">87%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Available Slots */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium">Horários Disponíveis</h3>
          <button
            onClick={() => loadAvailableSlots(selectedDate)}
            disabled={loading}
            className="flex items-center px-3 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <Clock className="w-4 h-4 mr-2" />
            Atualizar
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : availableSlots.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Nenhum horário disponível para a data selecionada</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableSlots.map((slot) => (
              <div
                key={slot.id}
                className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => {
                  setSelectedSlot(slot);
                  setShowBookingForm(true);
                }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{formatDate(slot.slot_date)}</p>
                    <p className="text-sm text-gray-600">{formatTime(slot.slot_time)}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {slot.duration_minutes}min
                    </p>
                  </div>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                    Disponível
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Booked Appointments */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="font-medium mb-4">Agendamentos Confirmados</h3>
        
        {bookedAppointments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Nenhum agendamento confirmado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bookedAppointments.map((appointment) => (
              <div key={appointment.id} className="flex justify-between items-center p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">{appointment.customer_name}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span className="flex items-center">
                        <Phone className="w-3 h-3 mr-1" />
                        {appointment.customer_phone}
                      </span>
                      <span className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {formatDate(appointment.date)} às {appointment.time}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                    {getServiceTypeLabel(appointment.service_type)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Booking Form Modal */}
      {showBookingForm && selectedSlot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6 border-b">
              <h3 className="text-lg font-medium">Agendar Visita</h3>
              <p className="text-sm text-gray-600 mt-1">
                {formatDate(selectedSlot.slot_date)} às {formatTime(selectedSlot.slot_time)}
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Cliente *
                </label>
                <input
                  type="text"
                  value={bookingData.contact_name}
                  onChange={(e) => setBookingData({
                    ...bookingData,
                    contact_name: e.target.value
                  })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Nome completo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone *
                </label>
                <input
                  type="tel"
                  value={bookingData.contact_phone}
                  onChange={(e) => setBookingData({
                    ...bookingData,
                    contact_phone: e.target.value
                  })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="+5511999999999"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Serviço
                </label>
                <select
                  value={bookingData.service_type}
                  onChange={(e) => setBookingData({
                    ...bookingData,
                    service_type: e.target.value
                  })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="consulta_joias">Consulta de Joias</option>
                  <option value="medicao_aro">Medição de Aro</option>
                  <option value="manutencao">Manutenção</option>
                  <option value="entrega">Entrega</option>
                  <option value="orcamento_presencial">Orçamento Presencial</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <textarea
                  value={bookingData.notes}
                  onChange={(e) => setBookingData({
                    ...bookingData,
                    notes: e.target.value
                  })}
                  rows={3}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Informações adicionais sobre a visita..."
                />
              </div>
            </div>

            <div className="p-6 border-t flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowBookingForm(false);
                  setSelectedSlot(null);
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleBookAppointment}
                disabled={!bookingData.contact_name || !bookingData.contact_phone}
                className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Confirmar Agendamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Integration Helper */}
      <div className="bg-blue-50 p-6 rounded-lg border">
        <h3 className="font-medium text-blue-800 mb-3 flex items-center">
          <Phone className="w-5 h-5 mr-2" />
          Integração WhatsApp
        </h3>
        <div className="text-sm text-blue-700 space-y-2">
          <p>
            <strong>Para agendar via WhatsApp:</strong> Use o template "t_agendar" no fluxo de vendas
          </p>
          <p>
            <strong>Confirmação automática:</strong> Cliente recebe mensagem de confirmação
          </p>
          <p>
            <strong>Lembretes:</strong> Sistema envia lembrete 1 dia antes da visita
          </p>
        </div>
        
        <div className="mt-4 p-3 bg-white rounded border">
          <p className="text-xs text-gray-600 font-medium mb-1">Exemplo de mensagem de confirmação:</p>
          <div className="text-xs text-gray-700">
            "✅ Agendamento confirmado!<br/>
            📅 {formatDate(selectedSlot?.slot_date || new Date().toISOString().split('T')[0])}<br/>
            🕐 {formatTime(selectedSlot?.slot_time || '14:00')}<br/>
            📍 Zaffira Joalheria - Centro<br/>
            💎 Estamos ansiosos para recebê-lo!"
          </div>
        </div>
      </div>
    </div>
  );
}