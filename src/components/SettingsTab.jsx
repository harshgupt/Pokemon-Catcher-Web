import { useState } from 'react'
import { loadSave, saveGame, deleteSave } from '../lib/save'

export default function SettingsTab({ gameState, setGameState }) {
  const [toast, setToast] = useState(null) // { message, type: 'success'|'warn' }

  function showToast(message, type = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 2500)
  }

  function handleSave() {
    saveGame(gameState)
    showToast('Game saved.')
  }

  function handleLoad() {
    const saved = loadSave()
    setGameState(saved)
    showToast('Save loaded.')
  }

  function handleReset() {
    if (!confirm('Reset all progress? This cannot be undone.')) return
    deleteSave()
    const fresh = loadSave()
    setGameState(fresh)
    showToast('Game reset.', 'warn')
  }

  return (
    <div style={styles.root}>
      <div style={styles.sections}>

        <Section title="Save Data">
          <ActionRow
            label="Save Game"
            description="Write current progress to the save file."
            buttonLabel="Save"
            buttonVariant="primary"
            onClick={handleSave}
          />
          <ActionRow
            label="Reload Save"
            description="Revert to the last saved state, discarding unsaved progress."
            buttonLabel="Load"
            buttonVariant="default"
            onClick={handleLoad}
          />
          <ActionRow
            label="Reset Game"
            description="Permanently delete all progress and start fresh."
            buttonLabel="Reset"
            buttonVariant="danger"
            onClick={handleReset}
          />
        </Section>

      </div>

      {toast && (
        <div style={{ ...styles.toast, ...(toast.type === 'warn' ? styles.toastWarn : styles.toastSuccess) }}>
          {toast.message}
        </div>
      )}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={styles.section}>
      <h2 style={styles.sectionTitle}>{title}</h2>
      <div style={styles.sectionBody}>{children}</div>
    </div>
  )
}

function ActionRow({ label, description, buttonLabel, buttonVariant, onClick }) {
  const btnStyle = {
    ...styles.btn,
    ...(buttonVariant === 'primary' ? styles.btnPrimary
      : buttonVariant === 'danger'  ? styles.btnDanger
      : styles.btnDefault),
  }
  return (
    <div style={styles.actionRow}>
      <div style={styles.actionInfo}>
        <span style={styles.actionLabel}>{label}</span>
        <span style={styles.actionDesc}>{description}</span>
      </div>
      <button style={btnStyle} onClick={onClick}>{buttonLabel}</button>
    </div>
  )
}

const styles = {
  root: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
  },
  sections: {
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
    overflowY: 'auto',
    maxWidth: '600px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  sectionTitle: {
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '8px',
  },
  sectionBody: {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
  },
  actionRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '24px',
    padding: '16px 20px',
    borderBottom: '1px solid var(--border)',
  },
  actionInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  actionLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  actionDesc: {
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  btn: {
    flexShrink: 0,
    padding: '7px 20px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'opacity var(--transition)',
  },
  btnPrimary: {
    background: 'var(--accent)',
    color: '#fff',
  },
  btnDefault: {
    background: 'var(--bg-surface)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-strong)',
  },
  btnDanger: {
    background: 'transparent',
    color: '#e57373',
    border: '1px solid #e57373',
  },
  toast: {
    position: 'absolute',
    bottom: '24px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '10px 24px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600',
    pointerEvents: 'none',
  },
  toastSuccess: {
    background: 'rgba(30, 40, 60, 0.92)',
    color: 'var(--accent-bright)',
    border: '1px solid var(--accent)',
  },
  toastWarn: {
    background: 'rgba(40, 20, 20, 0.92)',
    color: '#e57373',
    border: '1px solid #e57373',
  },
}
