
import React from 'react';

export const MicrophoneIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    {...props}
  >
    <path d="M12 18.75a6 6 0 006-6v-1.5a6 6 0 00-12 0v1.5a6 6 0 006 6zM12 2.25a.75.75 0 01.75.75v6a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75z" />
    <path d="M10.5 9.75a.75.75 0 00-1.5 0v1.5a3 3 0 006 0v-1.5a.75.75 0 00-1.5 0v1.5a1.5 1.5 0 01-3 0v-1.5z" />
    <path d="M3.52 9.22A.75.75 0 014.27 9l.415-.415a9.938 9.938 0 0114.63 0l.415.415a.75.75 0 01-.53 1.28l-.415-.415a8.438 8.438 0 00-12.57 0l-.415.415a.75.75 0 01-1.28-.53z" />
  </svg>
);
