import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { useGameStore } from './state/useGameStore';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element #root not found');
}

// Hydration runs before the React tree mounts on purpose. Doing it in an effect
// would run twice under StrictMode and could race two Day Zero states into the
// same IndexedDB snapshot.
await useGameStore.getState().hydrate(Date.now());

// The snapshot can be days old: roll the operational day before the first
// paint so the HUD never shows yesterday's counters (US-05 CA-02).
await useGameStore.getState().tick();

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
