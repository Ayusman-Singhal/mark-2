import { useState, useEffect } from 'react';

const HelpPage = () => {
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const adminStatus = await window.electronAPI.checkAdmin();
      setIsAdmin(adminStatus);
    } catch (error) {
      console.error('Failed to check admin status:', error);
    }
  };

  const handleRunAsAdmin = async () => {
    setIsLoading(true);
    try {
      const result = await window.electronAPI.restartAsAdmin();
      if (!result.success) {
        alert(`Failed to restart as admin: ${result.error || 'Unknown error'}`);
        setIsLoading(false);
      }
      // If successful, the app will restart so we don't need to reset loading state
    } catch (error) {
      alert('Failed to restart as admin. Make sure to allow the UAC prompt if it appears.');
      console.error('Admin restart error:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 animate-fade-in">
      <h2 className="text-3xl font-light mb-4 text-gray-700">Help</h2>
      <p className="mb-4 text-gray-500">Welcome to the help section.</p>
      
      {/* Admin Status Indicator */}
      <div className="mb-8 p-4 rounded-lg border-2 border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${isAdmin ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-gray-700 font-medium">
              Admin Status: {isAdmin ? 'Running as Administrator' : 'Running as Standard User'}
            </span>
          </div>
          {isAdmin && (
            <div className="flex items-center space-x-2 text-green-600">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">Elevated Privileges</span>
            </div>
          )}
        </div>
      </div>

      <div className="feature-cards">
        <div className="card">
          <h3>📅 Help Feature 1</h3>
          <p>Run application with administrator privileges for advanced features</p>
          <button 
            className={`card-button ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={handleRunAsAdmin}
            disabled={isLoading || isAdmin}
          >
            {isLoading ? 'Restarting...' : isAdmin ? 'Already Admin' : 'Run as Administrator'}
          </button>
        </div>
        <div className="card">
          <h3>⚙️ Help Feature 2</h3>
          <p>Description of the second help feature</p>
          <button className="card-button" onClick={() => alert('Help Feature 2 activated!')}>Try Feature 2</button>
        </div>
        <div className="card">
          <h3>📊 Help Statistics</h3>
          <p>View help related statistics and data</p>
        </div>
      </div>
    </div>
  );
};

export default HelpPage;
