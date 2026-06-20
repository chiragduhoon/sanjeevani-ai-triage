// Mock data for doctors, appointments, beds, and prescriptions

export const MOCK_DOCTORS = [
  { id: 1, name: 'Dr. Sarah Johnson', specialty: 'Cardiology', available: true, nextSlot: '2:30 PM' },
  { id: 2, name: 'Dr. Rajesh Kumar', specialty: 'Emergency Medicine', available: true, nextSlot: '2:00 PM' },
  { id: 3, name: 'Dr. Priya Sharma', specialty: 'Respiratory', available: false, nextSlot: '4:00 PM' },
  { id: 4, name: 'Dr. Amit Patel', specialty: 'General Practice', available: true, nextSlot: '2:15 PM' },
  { id: 5, name: 'Dr. Michelle Chen', specialty: 'Internal Medicine', available: true, nextSlot: '3:00 PM' },
]

export const SPECIALTIES = ['Cardiology', 'Emergency Medicine', 'Respiratory', 'General Practice', 'Internal Medicine', 'Surgery']

export const MOCK_AVAILABLE_SLOTS = [
  '2:00 PM', '2:15 PM', '2:30 PM', '2:45 PM', '3:00 PM', '3:15 PM', '3:30 PM', '3:45 PM', '4:00 PM',
]

export const MOCK_APPOINTMENTS = []

export const BED_TYPES = {
  ICU: { total: 5, available: 2 },
  EMERGENCY: { total: 8, available: 3 },
  GENERAL: { total: 15, available: 7 },
  PRIVATE: { total: 4, available: 1 },
}

export const AMBULANCE_STATUSES = ['Idle', 'Requested', 'Dispatched', 'Arriving', 'On-site']

export const MOCK_PRESCRIPTIONS = []

export const MOCK_DOCTOR_INSTRUCTIONS = null
