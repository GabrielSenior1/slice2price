import React from 'react';
import { useApp } from '../context/AppContext.js';

export const Toast: React.FC = () => {
  const { toast } = useApp();

  if (!toast) return null;

  const getIcon = () => {
    switch (toast.type) {
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      case 'success':
      default:
        return 'check_circle';
    }
  };

  return (
    <div className="toast-container">
      <div className={`toast toast--${toast.type || 'success'}`}>
        <span className="material-symbols-outlined icon-sm toast__icon">{getIcon()}</span>
        <span className="toast__text">{toast.message}</span>
      </div>
    </div>
  );
};
