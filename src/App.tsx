import React, { useState } from 'react';
import './globals.css';
import TitleBar from './components/layout/TitleBar.tsx';
import { AppSidebar } from './components/layout/AppSidebar.tsx';
import LoadingScreen from './components/ui/LoadingScreen.tsx';

// Import all pages
import HomePage from './components/pages/Home.tsx';
import LogsPage from './components/pages/Logs.tsx';
import ToolsPage from './components/pages/Tools.tsx';
import HelpPage from './components/pages/Help.tsx';
import ProcessesPage from './components/pages/ProcessesPage.tsx';

// Page mapping
const pageComponents: Record<string, React.ComponentType> = {
  home: HomePage,
  logs: LogsPage,
  tools: ToolsPage,
  help: HelpPage,
  processespage: ProcessesPage,
};

function App() {
  const [currentPage, setCurrentPage] = useState<string>('home');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [appReady, setAppReady] = useState<boolean>(false);

  const handlePageChange = (page: string) => {
    setCurrentPage(page);
  };

  // Expose navigation function globally for components to use
  React.useEffect(() => {
    (window as any).navigateToPage = handlePageChange;
    return () => {
      delete (window as any).navigateToPage;
    };
  }, []);

  const handleLoadingComplete = () => {
    setIsLoading(false);
    setAppReady(true);
  };

  const CurrentPageComponent = pageComponents[currentPage] || HomePage;

  if (!appReady) {
    return (
      <LoadingScreen
        isLoading={isLoading}
        onLoadingComplete={handleLoadingComplete}
        duration={2500}
      />
    );
  }

  return (
    <div className="app-container">
      <TitleBar />
      <div className="flex">
        <AppSidebar 
          currentPage={currentPage}
          onPageChange={handlePageChange}
        />
        <main 
          className="flex-1 overflow-auto" 
          style={{ 
            backgroundColor: '#EAF4F4', 
            height: 'calc(100vh - 60px)',
            marginLeft: '60px' // Matches collapsed sidebar width
          }}
        >
          <CurrentPageComponent />
        </main>
      </div>
    </div>
  );
}

export default App;
