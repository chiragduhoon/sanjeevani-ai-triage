import React, { useState } from 'react'
import { MOCK_DOCTORS, SPECIALTIES, MOCK_AVAILABLE_SLOTS, MOCK_APPOINTMENTS } from './mockData'
import { s } from './styles'

export default function AppointmentBooking() {
  const [selectedSpecialty, setSelectedSpecialty] = useState('')
  const [selectedDoctor, setSelectedDoctor] = useState(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [appointments, setAppointments] = useState(MOCK_APPOINTMENTS)
  const [bookingStep, setBookingStep] = useState('specialty') // specialty -> doctor -> datetime -> confirm
  const [confirmedAppointment, setConfirmedAppointment] = useState(null)

  const filteredDoctors = selectedSpecialty
    ? MOCK_DOCTORS.filter(d => d.specialty === selectedSpecialty)
    : MOCK_DOCTORS

  const handleBookAppointment = () => {
    if (selectedDoctor && selectedDate && selectedTime) {
      const newAppointment = {
        id: Date.now(),
        doctor: selectedDoctor,
        date: selectedDate,
        time: selectedTime,
        status: 'Confirmed',
      }
      setAppointments([...appointments, newAppointment])
      setConfirmedAppointment(newAppointment)
      setBookingStep('confirmed')
    }
  }

  const resetBooking = () => {
    setSelectedSpecialty('')
    setSelectedDoctor(null)
    setSelectedDate('')
    setSelectedTime('')
    setBookingStep('specialty')
    setConfirmedAppointment(null)
  }

  // Get next 7 days for date selection
  const getAvailableDates = () => {
    const dates = []
    for (let i = 1; i <= 7; i++) {
      const date = new Date()
      date.setDate(date.getDate() + i)
      dates.push(date.toISOString().split('T')[0])
    }
    return dates
  }

  return (
    <div style={s.card}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 16px' }}>
        Book Doctor Appointment
      </h3>

      {confirmedAppointment ? (
        <div style={{
          padding: 12,
          borderRadius: 8,
          background: '#ECFDF5',
          border: '1px solid #86EFAC',
          marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#059669' }}>
              Appointment Confirmed
            </span>
          </div>
          <div style={{ fontSize: 13, color: '#065F46', lineHeight: 1.6 }}>
            <p style={{ margin: '0 0 8px' }}>
              <strong>Doctor:</strong> {confirmedAppointment.doctor.name}
            </p>
            <p style={{ margin: '0 0 8px' }}>
              <strong>Specialty:</strong> {confirmedAppointment.doctor.specialty}
            </p>
            <p style={{ margin: '0 0 8px' }}>
              <strong>Date:</strong> {confirmedAppointment.date}
            </p>
            <p style={{ margin: 0 }}>
              <strong>Time:</strong> {confirmedAppointment.time}
            </p>
          </div>
        </div>
      ) : null}

      {bookingStep === 'specialty' && (
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 8 }}>
            Filter by Specialty (Optional)
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8, marginBottom: 16 }}>
            {['All'].concat(SPECIALTIES).map(spec => (
              <button
                key={spec}
                onClick={() => setSelectedSpecialty(spec === 'All' ? '' : spec)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid #E5E7EB',
                  background: (spec === 'All' && !selectedSpecialty) || selectedSpecialty === spec ? '#2563EB' : 'white',
                  color: (spec === 'All' && !selectedSpecialty) || selectedSpecialty === spec ? 'white' : '#6B7280',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {spec}
              </button>
            ))}
          </div>

          <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 8 }}>
            Select Doctor
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredDoctors.map(doctor => (
              <button
                key={doctor.id}
                onClick={() => {
                  setSelectedDoctor(doctor)
                  setBookingStep('datetime')
                }}
                style={{
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid #E5E7EB',
                  background: 'white',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  hover: { background: '#F9FAFB' },
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>
                      {doctor.name}
                    </p>
                    <p style={{ fontSize: 12, color: '#6B7280', margin: '2px 0 0' }}>
                      {doctor.specialty}
                    </p>
                  </div>
                  <span style={{
                    fontSize: 11,
                    padding: '4px 8px',
                    borderRadius: 4,
                    background: doctor.available ? '#DCFCE7' : '#FEE2E2',
                    color: doctor.available ? '#166534' : '#991B1B',
                  }}>
                    {doctor.available ? 'Available' : 'Busy'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {bookingStep === 'datetime' && selectedDoctor && (
        <div>
          <button
            onClick={() => setBookingStep('specialty')}
            style={{
              padding: 0,
              border: 'none',
              background: 'none',
              color: '#2563EB',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 500,
              marginBottom: 12,
            }}
          >
            ← Back to Doctors
          </button>

          <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: '0 0 12px' }}>
            {selectedDoctor.name} - {selectedDoctor.specialty}
          </p>

          <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 8 }}>
            Select Date
          </label>
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid #E5E7EB',
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            <option value="">Choose a date...</option>
            {getAvailableDates().map(date => (
              <option key={date} value={date}>
                {new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </option>
            ))}
          </select>

          <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 8 }}>
            Select Time
          </label>
          <select
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid #E5E7EB',
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            <option value="">Choose a time...</option>
            {MOCK_AVAILABLE_SLOTS.map(slot => (
              <option key={slot} value={slot}>
                {slot}
              </option>
            ))}
          </select>

          <button
            onClick={handleBookAppointment}
            disabled={!selectedDate || !selectedTime}
            style={{
              width: '100%',
              padding: '10px 16px',
              borderRadius: 6,
              border: 'none',
              background: selectedDate && selectedTime ? '#2563EB' : '#D1D5DB',
              color: 'white',
              fontSize: 13,
              fontWeight: 600,
              cursor: selectedDate && selectedTime ? 'pointer' : 'default',
            }}
          >
            Confirm Appointment
          </button>
        </div>
      )}

      {confirmedAppointment && (
        <button
          onClick={resetBooking}
          style={{
            width: '100%',
            padding: '10px 16px',
            borderRadius: 6,
            border: 'none',
            background: '#6B7280',
            color: 'white',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            marginTop: 12,
          }}
        >
          Book Another Appointment
        </button>
      )}

      {appointments.length > 0 && (
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #E5E7EB' }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: '0 0 12px' }}>
            Your Appointments
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {appointments.map(apt => (
              <div
                key={apt.id}
                style={{
                  padding: 10,
                  borderRadius: 6,
                  background: '#F0F9FF',
                  border: '1px solid #BFE7F7',
                }}
              >
                <p style={{ fontSize: 12, fontWeight: 600, color: '#0C2340', margin: 0 }}>
                  {apt.doctor.name}
                </p>
                <p style={{ fontSize: 11, color: '#0284C7', margin: '2px 0 0' }}>
                  {apt.date} at {apt.time}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
