import { useState } from 'react';
import { 
  Monitor, 
  FileText, 
  Activity,
  Loader2
} from 'lucide-react';

// Extend window type for TypeScript
declare global {
  interface Window {
    navigateToPage?: (page: string) => void;
  }
}

const HomePage = () => {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Navigation mapping based on App.tsx page components
  const pageMapping: Record<string, string> = {
    pdf: 'tools',
    processes: 'processespage',
    systeminfo: 'systeminfo'
  };

  // Handle navigation to different pages
  const handleNavigation = (action: string) => {
    const targetPage = pageMapping[action];
    if (targetPage && window.navigateToPage) {
      window.navigateToPage(targetPage);
    }
  };

  // Handle quick action button clicks
  const handleQuickAction = async (action: string) => {
    setLoadingAction(action);
    
    try {
      // Add a small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 300));
      
      handleNavigation(action);
    } catch (error) {
      console.error(`Error executing action ${action}:`, error);
    } finally {
      setLoadingAction(null);
    }
  };

  const quickActions = [
    {
      title: "PDF Tools",
      description: "Create, edit and manage PDF documents",
      icon: FileText,
      action: "pdf"
    },
    {
      title: "Processes",
      description: "Monitor and manage system processes",
      icon: Activity,
      action: "processes"
    },
    {
      title: "System Info",
      description: "View detailed system information",
      icon: Monitor,
      action: "systeminfo"
    }
  ];

  return (
    <div className="home-container">
      {/* Header Section */}
      <div className="home-header">
        <h1 className="home-heading">
          Technician Dashboard
        </h1>
        <p className="home-description">
          Your comprehensive system management and diagnostic center
        </p>
      </div>

      {/* Quick Actions Grid */}
      <div className="home-section">
        <h2 className="section-heading">
          Quick Actions
        </h2>
        <div className="quick-actions-grid">
          {quickActions.map((action, index) => (
            <div 
              key={index} 
              className={`action-card ${loadingAction === action.action ? 'action-card-loading' : ''} ${loadingAction && loadingAction !== action.action ? 'disabled' : ''}`}
              onClick={() => handleQuickAction(action.action)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleQuickAction(action.action);
                }
              }}
            >
              <div className="action-icon">
                {loadingAction === action.action ? (
                  <Loader2 size={16} strokeWidth={2.5} className="icon animate-spin" />
                ) : (
                  <action.icon size={16} strokeWidth={2.5} className="icon" />
                )}
              </div>
              <div className="action-content">
                <h3 className="action-title">
                  {loadingAction === action.action ? 'Loading...' : action.title}
                </h3>
                <p className="action-description">
                  {loadingAction === action.action ? 'Please wait...' : action.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
