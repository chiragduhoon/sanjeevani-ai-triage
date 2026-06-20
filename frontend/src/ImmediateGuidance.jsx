import React from 'react'
import { getGuidanceForResult } from './careGuidance'

export default function ImmediateGuidance({ result }) {
  if (!result) return null

  const guidance = getGuidanceForResult(result)

  return (
    <div style={{
      padding: 16,
      borderRadius: 8,
      background: guidance.backgroundColor,
      border: `2px solid ${guidance.borderColor}`,
      marginTop: 16,
    }}>
      <h3 style={{
        fontSize: 14,
        fontWeight: 700,
        color: guidance.textColor,
        margin: '0 0 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
        </svg>
        {guidance.title}
      </h3>
      <ol style={{
        margin: 0,
        paddingLeft: 20,
        color: guidance.textColor,
        fontSize: 13,
        lineHeight: 1.6,
      }}>
        {guidance.specificActions.map((action, idx) => (
          <li key={idx} style={{ marginBottom: 8 }}>
            {action}
          </li>
        ))}
      </ol>
    </div>
  )
}
