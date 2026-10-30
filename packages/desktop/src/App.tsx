import React from 'react';
import { AppProvider, useApp } from './context/AppContext.js';
import { Header } from './components/Header.js';
import { Sidebar } from './components/Sidebar.js';
import { Footer } from './components/Footer.js';
import { Toast } from './components/Toast.js';
import { MiniOverlay } from './components/MiniOverlay.js';
import { LiveQuoter } from './views/LiveQuoter.js';
import { ProfilesView } from './views/ProfilesView.js';
import { HistoryView } from './views/HistoryView.js';
import { WatcherView } from './views/WatcherView.js';
import { SettingsView } from './views/SettingsView.js';

const MainContent: React.FC = () => {
  const { activeTab } = useApp();

  return (
    <main className="app-main">
      {activeTab === 'cotizador' && <LiveQuoter />}
      {activeTab === 'perfiles' && <ProfilesView />}
      {activeTab === 'historial' && <HistoryView />}
      {activeTab === 'vigilante' && <WatcherView />}
      {activeTab === 'ajustes' && <SettingsView />}
    </main>
  );
};

const AppShell: React.FC = () => {
  const { isCompactMode } = useApp();

  if (isCompactMode) {
    return (
      <>
        <MiniOverlay />
        <Toast />
      </>
    );
  }

  return (
    <div className="app-layout">
      <Header />
      <Sidebar />
      <MainContent />
      <Footer />
      <Toast />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
};

export default App;
