import React, { useState } from 'react'
import { s } from './styles'

export default function DoctorNotes({ patientId, onNoteSaved }) {
  const [notes, setNotes] = useState([])
  const [newNote, setNewNote] = useState('')
  const [noteType, setNoteType] = useState('consultation')

  const NOTE_TYPES = {
    consultation: { label: 'Consultation Notes', icon: '📝', color: '#3B82F6' },
    treatment: { label: 'Treatment Plan', icon: '💊', color: '#10B981' },
    followup: { label: 'Follow-up', icon: '🔄', color: '#F59E0B' },
    observation: { label: 'Observation', icon: '👁️', color: '#8B5CF6' },
  }

  const handleAddNote = () => {
    if (newNote.trim()) {
      const note = {
        id: Date.now(),
        type: noteType,
        content: newNote,
        timestamp: new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }),
        date: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
      }
      setNotes(prev => [note, ...prev])
      setNewNote('')
      if (onNoteSaved) {
        onNoteSaved(note)
      }
    }
  }

  const handleDeleteNote = (id) => {
    setNotes(prev => prev.filter(note => note.id !== id))
  }

  return (
    <div style={s.card}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 16px' }}>
        📋 Doctor Notes
      </h3>

      {/* Note Type Selection */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 6 }}>
          Note Type
        </label>
        <select
          value={noteType}
          onChange={(e) => setNoteType(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: 6,
            border: '1px solid #D1D5DB',
            fontSize: 12,
            boxSizing: 'border-box',
          }}
        >
          {Object.entries(NOTE_TYPES).map(([key, { label }]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Text Area */}
      <div style={{ marginBottom: 12 }}>
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Write your clinical notes here..."
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: 6,
            border: '1px solid #D1D5DB',
            fontSize: 12,
            fontFamily: 'inherit',
            boxSizing: 'border-box',
            minHeight: 80,
            resize: 'vertical',
          }}
        />
      </div>

      <button
        onClick={handleAddNote}
        disabled={!newNote.trim()}
        style={{
          width: '100%',
          padding: '10px 16px',
          borderRadius: 6,
          border: 'none',
          background: newNote.trim() ? '#3B82F6' : '#D1D5DB',
          color: 'white',
          fontSize: 12,
          fontWeight: 600,
          cursor: newNote.trim() ? 'pointer' : 'default',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Add Note
      </button>

      {/* Notes History */}
      {notes.length > 0 && (
        <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #E5E7EB' }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: '0 0 12px' }}>
            Clinical History ({notes.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {notes.map(note => {
              const type = NOTE_TYPES[note.type]
              return (
                <div
                  key={note.id}
                  style={{
                    padding: 12,
                    borderRadius: 6,
                    background: '#F9FAFB',
                    border: '1px solid #E5E7EB',
                    borderLeft: `3px solid ${type.color}`,
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    marginBottom: 8,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 14 }}>{type.icon}</span>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: type.color,
                      }}>
                        {type.label}
                      </span>
                    </div>
                    <span style={{
                      fontSize: 10,
                      color: '#9CA3AF',
                    }}>
                      {note.date} {note.timestamp}
                    </span>
                  </div>

                  <p style={{
                    fontSize: 12,
                    color: '#6B7280',
                    lineHeight: 1.6,
                    margin: '0 0 8px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}>
                    {note.content}
                  </p>

                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 4,
                      border: 'none',
                      background: '#FEE2E2',
                      color: '#DC2626',
                      fontSize: 10,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                  >
                    Delete
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {notes.length === 0 && !newNote && (
        <div style={{
          marginTop: 12,
          padding: 12,
          borderRadius: 6,
          background: '#F3F4F6',
          textAlign: 'center',
        }}>
          <p style={{ color: '#6B7280', fontSize: 12, margin: 0 }}>
            No notes yet. Start adding clinical notes about this patient.
          </p>
        </div>
      )}
    </div>
  )
}
