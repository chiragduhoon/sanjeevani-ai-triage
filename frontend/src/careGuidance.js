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

export const HINDI_GUIDANCE_BY_RISK = {
  CRITICAL: {
    title: 'तुरंत कार्रवाई आवश्यक है',
    actions: [
      'अभी एम्बुलेंस के लिए 108 पर कॉल करें',
      'खुद गाड़ी चलाने की कोशिश न करें',
      'ऑपरेटर को अपने लक्षण बताएं',
      'शांत रहें और निर्देशों का पालन करें',
      'अपना पहचान पत्र और आयुष्मान कार्ड तैयार रखें',
    ],
    backgroundColor: '#FEF2F2',
    borderColor: '#DC2626',
    textColor: '#991B1B',
  },
  HIGH: {
    title: 'जल्द चिकित्सा सहायता लें',
    actions: [
      'कुछ घंटों के भीतर डॉक्टर से मिलें',
      'अपने प्राथमिक चिकित्सक से संपर्क करें',
      'लक्षण बिगड़ने पर आपातकालीन कक्ष जाएं',
      'अपना चिकित्सा इतिहास तैयार रखें',
      'इन लक्षणों को नज़रअंदाज़ न करें',
    ],
    backgroundColor: '#FEF3C7',
    borderColor: '#D97706',
    textColor: '#92400E',
  },
  MODERATE: {
    title: 'अपॉइंटमेंट बुक करें',
    actions: [
      'अपने प्राथमिक चिकित्सक से संपर्क करें',
      '24-48 घंटों के भीतर अपॉइंटमेंट लें',
      'लक्षणों में किसी बदलाव पर ध्यान दें',
      'आराम करें और पानी पीते रहें',
      'भारी गतिविधि से बचें',
    ],
    backgroundColor: '#F3E8FF',
    borderColor: '#A855F7',
    textColor: '#581C87',
  },
  LOW: {
    title: 'स्वयं देखभाल निर्देश',
    actions: [
      'आराम करें और अपनी स्थिति पर नज़र रखें',
      'पर्याप्त पानी पिएं और अच्छा खाएं',
      'ओवर-द-काउंटर दवाइयाँ मदद कर सकती हैं',
      'लक्षण बढ़ने पर चिकित्सा सहायता लें',
      'ज़रूरत हो तो नियमित जांच बुक करें',
    ],
    backgroundColor: '#DBEAFE',
    borderColor: '#0284C7',
    textColor: '#0C2340',
  },
}

export const HINDI_SYMPTOM_SPECIFIC_GUIDANCE = {
  'chest pain': [
    'तुरंत बैठ जाएं या लेट जाएं',
    'कोई भी शारीरिक गतिविधि बंद करें',
    'एम्बुलेंस के लिए 108 पर कॉल करें',
    'यदि एलर्जी नहीं है तो एस्पिरिन चबाएं (डिस्पैचर से पूछें)',
    'तंग कपड़े ढीले करें',
  ],
  'difficulty breathing': [
    'सीधे बैठें — इससे सांस लेना आसान होगा',
    'तुरंत एम्बुलेंस के लिए 108 पर कॉल करें',
    'घबराएं नहीं — धीरे-धीरे गहरी सांस लेने की कोशिश करें',
    'यदि संभव हो तो ताज़ी हवा में जाएं',
    'यदि अस्थमा है तो इन्हेलर पास रखें',
  ],
  'severe bleeding': [
    'साफ कपड़े से सीधा दबाव लगाएं',
    'तुरंत 108 पर कॉल करें',
    'कपड़ा भीग जाए तो न हटाएं — ऊपर और कपड़ा लगाएं',
    'यदि संभव हो तो घायल हिस्से को ऊपर उठाएं',
    'शांत रहें',
  ],
  'stroke': [
    'ध्यान दें कि लक्षण कब शुरू हुए',
    'तुरंत 108 पर कॉल करें',
    'कुछ खाएं-पिएं नहीं',
    'व्यक्ति को शांत और स्थिर रखें',
    'समय बहुत महत्वपूर्ण है — हर मिनट मायने रखता है',
  ],
}

export function getGuidanceForResult(result, lang = 'en') {
  const isHindi = lang === 'hi'
  const guidanceMap = isHindi ? HINDI_GUIDANCE_BY_RISK : GUIDANCE_BY_RISK
  const specificMap = isHindi ? HINDI_SYMPTOM_SPECIFIC_GUIDANCE : SYMPTOM_SPECIFIC_GUIDANCE

  const riskGuidance = guidanceMap[result.risk_level] || guidanceMap.LOW

  // Check for specific symptoms in the transcript
  const transcript = result.transcript?.toLowerCase() || ''
  const specificActions = []

  for (const [symptom, actions] of Object.entries(specificMap)) {
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
