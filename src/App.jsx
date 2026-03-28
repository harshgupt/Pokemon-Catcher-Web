import { useState } from 'react'
import './styles/index.css'
import Sidebar from './components/Sidebar'
import ItemDex  from './components/ItemDex'
import PokeDex  from './components/PokeDex'
import CatchTab from './components/CatchTab'

const PAGE_LABELS = {
  catch:    'Catch',
  pokedex:  'Pokédex',
  items:    'Items',
  evolve:   'Evolve',
  settings: 'Settings',
}

export default function App() {
  const [activePage, setActivePage] = useState('catch')

  return (
    <div style={styles.root}>
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <main style={styles.main}>
        <header style={styles.header}>
          <h1 style={styles.pageTitle}>{PAGE_LABELS[activePage]}</h1>
        </header>
        <div style={styles.content}>
          <div style={activePage === 'catch'   ? styles.page : styles.pageHidden}><CatchTab /></div>
          <div style={activePage === 'pokedex' ? styles.page : styles.pageHidden}><PokeDex /></div>
          <div style={activePage === 'items'   ? styles.page : styles.pageHidden}><ItemDex /></div>
          {activePage !== 'catch' && activePage !== 'items' && activePage !== 'pokedex' && <Placeholder page={activePage} />}
        </div>
      </main>
    </div>
  )
}

function Placeholder({ page }) {
  return (
    <div style={styles.placeholder}>
      <span style={styles.placeholderIcon}>◈</span>
      <p style={styles.placeholderText}>{PAGE_LABELS[page]} coming soon</p>
    </div>
  )
}

const styles = {
  root: {
    display: 'flex',
    height: '100vh',
    width: '100vw',
    overflow: 'hidden',
    background: 'var(--bg-base)',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    padding: '24px 32px 16px',
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg-surface)',
  },
  pageTitle: {
    fontSize: '22px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    letterSpacing: '-0.01em',
  },
  content: {
    flex: 1,
    overflow: 'hidden',
    padding: '32px',
    display: 'flex',
    flexDirection: 'column',
  },
  page: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  pageHidden: {
    display: 'none',
  },
  placeholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: '16px',
    opacity: 0.3,
  },
  placeholderIcon: {
    fontSize: '48px',
    color: 'var(--accent)',
  },
  placeholderText: {
    fontSize: '16px',
    color: 'var(--text-secondary)',
    fontWeight: '500',
  },
}
