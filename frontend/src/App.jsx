import React from 'react'
import { Routes, Route } from 'react-router-dom'
import PatientPage from './PatientPage'
import DoctorPage from './DoctorPage'
import HospitalPage from './HospitalPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PatientPage />} />
      <Route path="/doctor" element={<DoctorPage />} />
      <Route path="/hospital" element={<HospitalPage />} />
    </Routes>
  )
}
