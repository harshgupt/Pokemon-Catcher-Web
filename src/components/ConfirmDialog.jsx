const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.65)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
  },
  box: {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-strong)',
    borderRadius: 'var(--radius-md)',
    padding: '28px 32px',
    maxWidth: '360px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    boxShadow: 'var(--shadow-md)',
  },
  title: {
    fontSize: '16px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  message: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    lineHeight: '1.5',
  },
  btns: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
    marginTop: '4px',
  },
  btnCancel: {
    padding: '7px 20px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-strong)',
    background: 'var(--bg-surface)',
    color: 'var(--text-secondary)',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  btnConfirmDanger: {
    padding: '7px 20px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid #e57373',
    background: 'transparent',
    color: '#e57373',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  btnConfirmPrimary: {
    padding: '7px 20px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    background: 'var(--accent)',
    color: '#fff',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
}

export default function ConfirmDialog({ title, message, onConfirm, onCancel, confirmLabel = 'Confirm', variant = 'danger' }) {
  const confirmStyle = variant === 'primary' ? styles.btnConfirmPrimary : styles.btnConfirmDanger
  return (
    <div style={styles.overlay} onClick={onCancel}>
      <div style={styles.box} onClick={e => e.stopPropagation()}>
        <p style={styles.title}>{title}</p>
        {message && <p style={styles.message}>{message}</p>}
        <div style={styles.btns}>
          <button style={styles.btnCancel}  onClick={onCancel}>Cancel</button>
          <button style={confirmStyle}       onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
