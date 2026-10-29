import React from 'react';
import { AppProvider, useApp } from './context/AppContext.js';
import { Header } from './components/Header.js';
import { Sidebar } from './components/Sidebar.js';
import { Footer } from './components/Footer.js';
import { Toast } from './components/Toast.js';
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

export const App: React.FC = () => {
  return (
    <AppProvider>
      <div className="app-layout">
        <Header />
        <Sidebar />
        <MainContent />
        <Footer />
        <Toast />
      </div>
    </AppProvider>
  );
};

export default App;
