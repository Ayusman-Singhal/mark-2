import React, { useState } from 'react';
import {
  Home,
  Activity,
  FileText,
  BookCopy,
} from 'lucide-react';

interface NavigationItem {  
  title: string;
  icon: React.ComponentType<any>;
  page: string;
}

interface AppSidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

const navigationItems: NavigationItem[] = [
  {
    title: 'Home',
    icon: Home,
    page: 'home',
  },
  {
    title: 'Image Tools',
    icon: Activity,
    page: 'processespage',
  },
  {
    title: 'PDF Tools',
    icon: BookCopy,
    page: 'tools',
  },
  {
    title: 'Word Tools',
    icon: FileText,
    page: 'logs',
  },
];

export function AppSidebar({ currentPage, onPageChange }: AppSidebarProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Sizing constants for easy manual adjustment
  const SIDEBAR_WIDTH_COLLAPSED = '60px'; // Matches title bar icon width
  const SIDEBAR_WIDTH_EXPANDED = '175px';  // As requested max width
  const TRANSITION_DURATION = '300ms';

  return (
    <div
      className="fixed left-0 z-40 transition-all ease-in-out"
      style={{
        top: '60px',
        height: 'calc(100vh - 60px)',
        width: isHovered ? SIDEBAR_WIDTH_EXPANDED : SIDEBAR_WIDTH_COLLAPSED,
        backgroundColor: '#EAF4F4',
        borderRight: '1px solid #CCE3DE',
        transitionDuration: TRANSITION_DURATION
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Navigation Menu */}
      <nav style={{ padding: '8px' }}>
        <ul style={{ display: 'flex', flexDirection: 'column', gap: '4px', margin: 0, padding: 0, listStyle: 'none' }}>
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.page;
            
            return (
              <li key={item.page}>
                <button
                  onClick={() => onPageChange(item.page)}
                  className="group relative w-full text-left transition-all duration-200"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: isActive ? '#CCE3DE' : 'transparent',
                    border: 'none',
                    color: '#000000',
                    fontSize: '14px',
                    fontWeight: '500',
                    fontFamily: 'Atkinson Hyperlegible, sans-serif',
                    cursor: 'pointer',
                    transitionDuration: TRANSITION_DURATION
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = '#D1E4E0';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <Icon 
                    size={20} 
                    strokeWidth={1.5}
                    style={{ 
                      flexShrink: 0,
                      minWidth: '20px',
                      minHeight: '20px'
                    }} 
                  />
                  <span
                    style={{
                      overflow: 'hidden',
                      transition: `opacity ${TRANSITION_DURATION} ease, width ${TRANSITION_DURATION} ease`,
                      opacity: isHovered ? 1 : 0,
                      width: isHovered ? 'auto' : '0',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {item.title}
                  </span>
                  
                  {/* Tooltip for collapsed state */}
                  {!isHovered && (
                    <div 
                      className="absolute pointer-events-none z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      style={{
                        left: '100%',
                        marginLeft: '8px',
                        padding: '4px 8px',
                        backgroundColor: '#1f2937',
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: '500',
                        fontFamily: 'Atkinson Hyperlegible, sans-serif',
                        borderRadius: '4px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {item.title}
                    </div>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
