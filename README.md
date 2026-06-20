# 🏥 Sanjeevani - AI Powered Healthcare Triage System

Sanjeevani is an AI-powered healthcare triage platform designed to assist patients and healthcare professionals by enabling rapid symptom assessment, risk prioritization, emergency detection, and real-time doctor notifications.

The system helps reduce response time during medical emergencies by automatically identifying high-risk patients and placing them at the top of the doctor's queue.

---

## 🚀 Features

### 👤 Patient Dashboard

* Voice-based symptom input
* Manual symptom entry
* AI-powered symptom assessment
* Risk classification:

  * Critical
  * High
  * Moderate
  * Low
* Personalized patient ID
* Medical guidance and recommendations
* Appointment booking
* Bed availability requests
* Prescription viewing
* Patient history tracking

### 👨‍⚕️ Doctor Dashboard

* Real-time patient queue
* Critical patient prioritization
* WebSocket-based live updates
* Patient history access
* Bed management
* Prescription management
* Doctor notes and recommendations
* Queue filtering by risk level
* Clinical summary generation

### 🚨 Emergency Detection

The system automatically detects emergency conditions such as:

* Chest pain
* Difficulty breathing
* Stroke-like symptoms
* Loss of consciousness
* Severe bleeding

Critical patients are immediately prioritized and surfaced to doctors.

---

## 🏗️ System Architecture

Patient Interface
↓
FastAPI Backend
↓
AI Triage Engine
↓
WebSocket Notification Service
↓
Doctor Dashboard

---

## 🛠️ Tech Stack

### Frontend

* React
* Vite
* JavaScript
* Web Speech API

### Backend

* FastAPI
* Python
* WebSockets

### AI Layer

* Rule-Based Emergency Detection
* AI-Powered Symptom Analysis

### Storage

* Local Storage
* Persistent Patient History

---

## 📸 Demo Workflow

1. Patient describes symptoms using voice or text.
2. System analyzes symptoms.
3. Risk level is assigned.
4. Critical cases trigger instant alerts.
5. Doctor receives patient in priority queue.
6. Doctor reviews symptoms and clinical summary.
7. Prescription and recommendations are issued.
8. Patient receives guidance and treatment plan.

---

## ⚡ Installation

### Clone Repository

```bash
git clone https://github.com/chiragduhoon/sanjeevani-ai-triage.git
cd sanjeevani-ai-triage
```

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
python main.py
```

Backend runs at:

```text
http://localhost:8000
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at:

```text
http://localhost:5173
```

---

## 🎯 Hackathon Vision

Sanjeevani aims to improve emergency healthcare response by reducing the time between symptom reporting and medical intervention.

By combining AI triage, real-time alerts, and intelligent patient prioritization, the platform helps healthcare providers focus on patients who need immediate attention.

---

## 👨‍💻 Author

**Chirag Duhoon**

B.Tech Artificial Intelligence
Bennett University

GitHub: https://github.com/chiragduhoon

---

## 📄 License

This project is developed for educational, research, and hackathon purposes.
