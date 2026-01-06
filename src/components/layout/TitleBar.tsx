import icon from '/assets/icon.png';

const TitleBar = () => {
  const handleMinimize = () => {
    window.electronAPI?.minimizeWindow();
  };

  const handleClose = () => {
    window.electronAPI?.closeWindow();
  };

  return (
    <div className="custom-title-bar">
      <div className="title-bar-left">
        <div className="app-logo group">
          <div className="logo-icon">
            <img
              src={icon}
              alt="Technician Icon"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const fallback = target.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
            <span className="fallback-icon" style={{ display: 'none' }}>
              🔧
            </span>
          </div>
          <span className="app-name">Document Converter</span>
        </div>
      </div>
      <div className="title-bar-right">
        <button className="window-control minimize-btn" onClick={handleMinimize} title="Minimize">
          <span className="control-icon">─</span>
        </button>
        <button className="window-control close-btn" onClick={handleClose} title="Close">
          <span className="control-icon">✕</span>
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
