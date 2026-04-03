import { useState } from 'react'

const NAV_ITEMS = [
  { id: 'catch',        label: 'Catch',        icon: '⬡' },
  { id: 'pokedex',      label: 'Pokédex',      icon: '◉' },
  { id: 'items',        label: 'Items',        icon: '◈' },
  { id: 'evolve',       label: 'Evolve',       icon: '⟳' },
  { id: 'achievements', label: 'Achievements', icon: '◆' },
]

const BOTTOM_ITEMS = [
  { id: 'settings', label: 'Settings', icon: '⚙' },
]

export default function Sidebar({ activePage, onNavigate }) {
  return (
    <aside style={styles.sidebar}>
      {/* Logo */}
      <div style={styles.logo}>
        <span style={styles.logoIcon}>◈</span>
        <span style={styles.logoText}>Pokémon<br /><strong>Catcher</strong></span>
      </div>

      <div style={styles.divider} />

      {/* Main nav */}
      <nav style={styles.nav}>
        {NAV_ITEMS.map(item => (
          <NavButton
            key={item.id}
            item={item}
            active={activePage === item.id}
            onClick={() => onNavigate(item.id)}
          />
        ))}
      </nav>

      {/* Bottom nav */}
      <div style={styles.bottom}>
        <div style={styles.divider} />
        {BOTTOM_ITEMS.map(item => (
          <NavButton
            key={item.id}
            item={item}
            active={activePage === item.id}
            onClick={() => onNavigate(item.id)}
          />
        ))}
      </div>
    </aside>
  )
}

function NavButton({ item, active, onClick }) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      style={{
        ...styles.navBtn,
        ...(active ? styles.navBtnActive : hovered ? styles.navBtnHover : {}),
      }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span style={{
        ...styles.navIcon,
        ...(active ? styles.navIconActive : {}),
      }}>
        {item.icon}
      </span>
      <span style={{
        ...styles.navLabel,
        ...(active ? styles.navLabelActive : {}),
      }}>
        {item.label}
      </span>
      {active && <span style={styles.activeIndicator} />}
    </button>
  )
}

const styles = {
  sidebar: {
    width: 'var(--sidebar-width)',
    minWidth: 'var(--sidebar-width)',
    height: '100%',
    background: 'var(--bg-surface)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    padding: '20px 12px',
    gap: '4px',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 10px 16px',
  },
  logoIcon: {
    fontSize: '28px',
    color: 'var(--accent)',
    filter: 'drop-shadow(0 0 8px var(--accent))',
    lineHeight: 1,
  },
  logoText: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
  },
  divider: {
    height: '1px',
    background: 'var(--border)',
    margin: '8px 4px',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: 1,
  },
  bottom: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  navBtn: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
    transition: 'background var(--transition), color var(--transition)',
    color: 'var(--text-muted)',
  },
  navBtnHover: {
    background: 'var(--bg-hover)',
    color: 'var(--text-secondary)',
  },
  navBtnActive: {
    background: 'var(--accent-glow)',
    color: 'var(--text-primary)',
  },
  navIcon: {
    fontSize: '18px',
    width: '22px',
    textAlign: 'center',
    transition: 'color var(--transition)',
    color: 'inherit',
  },
  navIconActive: {
    color: 'var(--accent)',
    filter: 'drop-shadow(0 0 6px var(--accent))',
  },
  navLabel: {
    fontSize: '14px',
    fontWeight: '500',
    letterSpacing: '0.01em',
  },
  navLabelActive: {
    color: 'var(--text-primary)',
  },
  activeIndicator: {
    position: 'absolute',
    right: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    width: '3px',
    height: '60%',
    borderRadius: '3px 0 0 3px',
    background: 'var(--accent)',
    boxShadow: '0 0 8px var(--accent)',
  },
}
