// Patient history storage utility using localStorage

const PATIENT_HISTORY_KEY = 'sanjeevani_patient_history'
const PATIENT_ID_COUNTER_KEY = 'sanjeevani_patient_id_counters'

function getIdCounters() {
  try {
    const data = localStorage.getItem(PATIENT_ID_COUNTER_KEY)
    return data ? JSON.parse(data) : {}
  } catch {
    return {}
  }
}

function saveIdCounters(counters) {
  try {
    localStorage.setItem(PATIENT_ID_COUNTER_KEY, JSON.stringify(counters))
  } catch {}
}

export function generatePatientId(name = null) {
  if (!name || !name.trim()) {
    // Fallback: use PATIENT-NNN format
    const counters = getIdCounters()
    const count = (counters['PATIENT'] || 0) + 1
    counters['PATIENT'] = count
    saveIdCounters(counters)
    return `PATIENT-${String(count).padStart(3, '0')}`
  }

  // Convert name to uppercase, keep only letters and digits
  const nameKey = name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')

  const counters = getIdCounters()
  const count = (counters[nameKey] || 0) + 1
  counters[nameKey] = count
  saveIdCounters(counters)

  return `${nameKey}-${String(count).padStart(3, '0')}`
}

export function savePatientHistory(result, transcript, existingPatientId = null, patientName = null) {
  try {
    const history = getPatientHistory()
    const patientId = existingPatientId || generatePatientId(patientName)
    const entry = {
      patientId,
      patientName: patientName || '',
      ...result,
      transcript,
      submittedAt: new Date().toISOString(),
      displayTime: new Date().toLocaleTimeString(),
      displayDate: new Date().toLocaleDateString(),
    }
    history.push(entry)
    localStorage.setItem(PATIENT_HISTORY_KEY, JSON.stringify(history))
    return patientId
  } catch (err) {
    console.error('Failed to save patient history:', err)
    return null
  }
}

export function getPatientHistory() {
  try {
    const data = localStorage.getItem(PATIENT_HISTORY_KEY)
    return data ? JSON.parse(data) : []
  } catch (err) {
    console.error('Failed to retrieve patient history:', err)
    return []
  }
}

export function getPatientById(patientId) {
  try {
    const history = getPatientHistory()
    return history.find(p => p.patientId === patientId) || null
  } catch (err) {
    console.error('Failed to retrieve patient:', err)
    return null
  }
}

export function updatePatientDetails(patientId, updates) {
  try {
    const history = getPatientHistory()
    const index = history.findIndex(p => p.patientId === patientId)
    if (index !== -1) {
      history[index] = { ...history[index], ...updates, updatedAt: new Date().toISOString() }
      localStorage.setItem(PATIENT_HISTORY_KEY, JSON.stringify(history))
      return history[index]
    }
    return null
  } catch (err) {
    console.error('Failed to update patient:', err)
    return null
  }
}

export function savePatientNotes(patientId, notes) {
  try {
    const history = getPatientHistory()
    const index = history.findIndex(p => p.patientId === patientId)
    if (index !== -1) {
      history[index].notes = notes
      history[index].notesUpdatedAt = new Date().toISOString()
      localStorage.setItem(PATIENT_HISTORY_KEY, JSON.stringify(history))
      return history[index]
    }
    return null
  } catch (err) {
    console.error('Failed to save patient notes:', err)
    return null
  }
}

export function savePrescriptions(patientId, prescriptions) {
  try {
    const history = getPatientHistory()
    const index = history.findIndex(p => p.patientId === patientId)
    if (index !== -1) {
      history[index].prescriptions = prescriptions
      history[index].prescriptionsUpdatedAt = new Date().toISOString()
      localStorage.setItem(PATIENT_HISTORY_KEY, JSON.stringify(history))
      return history[index]
    }
    return null
  } catch (err) {
    console.error('Failed to save prescriptions:', err)
    return null
  }
}

export function saveDoctorInstructions(patientId, instructions) {
  try {
    const history = getPatientHistory()
    const index = history.findIndex(p => p.patientId === patientId)
    if (index !== -1) {
      history[index].doctorInstructions = instructions
      history[index].instructionsUpdatedAt = new Date().toISOString()
      localStorage.setItem(PATIENT_HISTORY_KEY, JSON.stringify(history))
      return history[index]
    }
    return null
  } catch (err) {
    console.error('Failed to save doctor instructions:', err)
    return null
  }
}

export function deletePatient(patientId) {
  try {
    const history = getPatientHistory()
    const filtered = history.filter(p => p.patientId !== patientId)
    localStorage.setItem(PATIENT_HISTORY_KEY, JSON.stringify(filtered))
    return true
  } catch (err) {
    console.error('Failed to delete patient:', err)
    return false
  }
}

export function clearAllHistory() {
  try {
    localStorage.setItem(PATIENT_HISTORY_KEY, JSON.stringify([]))
    return true
  } catch (err) {
    console.error('Failed to clear history:', err)
    return false
  }
}

export function getPatientsByRiskLevel(riskLevel) {
  try {
    const history = getPatientHistory()
    return history.filter(p => p.risk_level === riskLevel)
  } catch (err) {
    console.error('Failed to filter patients:', err)
    return []
  }
}

export function getRecentPatients(limit = 10) {
  try {
    const history = getPatientHistory()
    return history.slice(-limit).reverse()
  } catch (err) {
    console.error('Failed to get recent patients:', err)
    return []
  }
}
