// Immediate care guidance based on symptoms and risk level

export const GUIDANCE_BY_RISK = {
  CRITICAL: {
    title: 'IMMEDIATE ACTION REQUIRED',
    actions: [
      'Call emergency services (911) immediately',
      'Do not attempt to drive yourself',
      'Inform the operator of your symptoms',
      'Stay calm and follow dispatcher instructions',
      'Have your ID and insurance card ready',
    ],
    backgroundColor: '#FEF2F2',
    borderColor: '#DC2626',
    textColor: '#991B1B',
  },
  HIGH: {
    title: 'Urgent Care Recommended',
    actions: [
      'Seek medical attention within the next few hours',
      'Contact your primary care physician',
      'Visit an urgent care or emergency room if symptoms worsen',
      'Have your medical history available',
      'Do not ignore these symptoms',
    ],
    backgroundColor: '#FEF3C7',
    borderColor: '#D97706',
    textColor: '#92400E',
  },
  MODERATE: {
    title: 'Schedule Appointment',
    actions: [
      'Contact your primary care physician',
      'Schedule an appointment within 24-48 hours',
      'Monitor your symptoms for any changes',
      'Rest and stay hydrated',
      'Avoid strenuous activities',
    ],
    backgroundColor: '#F3E8FF',
    borderColor: '#A855F7',
    textColor: '#581C87',
  },
  LOW: {
    title: 'Self-Care Guidance',
    actions: [
      'Rest and monitor your condition',
      'Stay hydrated and eat well',
      'Over-the-counter medications may help',
      'Seek care if symptoms persist or worsen',
      'Schedule a routine check-up if needed',
    ],
    backgroundColor: '#DBEAFE',
    borderColor: '#0284C7',
    textColor: '#0C2340',
  },
}

export const SYMPTOM_SPECIFIC_GUIDANCE = {
  'chest pain': [
    'Sit down or lie down immediately',
    'Avoid any physical exertion',
    'Call emergency services',
    'Chew aspirin if not allergic (ask emergency dispatcher)',
    'Loosen tight clothing',
  ],
  'difficulty breathing': [
    'Sit upright to aid breathing',
    'Call emergency services immediately',
    'Do not panic - try slow, deep breaths',
    'Move to fresh air if possible',
    'Keep inhaler nearby if you have asthma',
  ],
  'severe bleeding': [
    'Apply direct pressure with clean cloth',
    'Call emergency services immediately',
    'Do not remove the cloth if soaked - add another on top',
    'Elevate the injured area if possible',
    'Stay calm and reassure the person',
  ],
  'stroke': [
    'Note the time symptoms started',
    'Call emergency services immediately',
    'Do not eat or drink',
    'Keep the person calm and still',
    'Time is critical - every minute counts',
  ],
  'severe allergic reaction': [
    'Call emergency services immediately',
    'Use epinephrine auto-injector if available',
    'Lie down with legs elevated',
    'Do not leave the person alone',
    'Keep the used injector to show paramedics',
  ],
}

export function getGuidanceForResult(result) {
  const riskGuidance = GUIDANCE_BY_RISK[result.risk_level] || GUIDANCE_BY_RISK.LOW

  // Check for specific symptoms in the transcript
  const transcript = result.transcript?.toLowerCase() || ''
  const specificActions = []

  for (const [symptom, actions] of Object.entries(SYMPTOM_SPECIFIC_GUIDANCE)) {
    if (transcript.includes(symptom)) {
      specificActions.push(...actions)
      break
    }
  }

  return {
    ...riskGuidance,
    specificActions: specificActions.length > 0 ? specificActions : riskGuidance.actions,
  }
}
