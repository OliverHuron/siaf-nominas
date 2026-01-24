import React from 'react';
import './UIComponents.css';

/**
 * Sistema de Componentes UI según el nuevo diseño
 * Paleta: Indigo (primario), Slate (secundario), Emerald (éxito), Amber (advertencia), Rose (error)
 */

// ===== BUTTONS =====
export const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  icon, 
  onClick, 
  disabled,
  className = '',
  type = 'button',
  ...props 
}) => {
  const sizeClasses = {
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg'
  };

  return (
    <button
      type={type}
      className={`btn btn-${variant} ${sizeClasses[size]} ${className}`}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="btn-icon-wrapper">{icon}</span>}
      {children}
    </button>
  );
};

export const IconButton = ({ 
  icon, 
  onClick, 
  disabled, 
  size = 'md',
  variant = 'secondary',
  className = '', 
  ...props 
}) => {
  const sizeClasses = {
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg'
  };

  return (
    <button
      className={`btn btn-icon btn-${variant} ${sizeClasses[size]} ${className}`}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {icon}
    </button>
  );
};

// ===== CARDS =====
export const Card = ({ children, className = '', hover = false, ...props }) => (
  <div className={`ui-card ${hover ? 'ui-card-hover' : ''} ${className}`} {...props}>
    {children}
  </div>
);

export const CardHeader = ({ children, className = '' }) => (
  <div className={`ui-card-header ${className}`}>
    {children}
  </div>
);

export const CardTitle = ({ children, className = '' }) => (
  <h3 className={`ui-card-title ${className}`}>
    {children}
  </h3>
);

export const CardBody = ({ children, className = '' }) => (
  <div className={`ui-card-body ${className}`}>
    {children}
  </div>
);

// ===== INPUTS =====
export const Input = ({ 
  label, 
  error, 
  helper, 
  icon,
  className = '',
  ...props 
}) => (
  <div className="ui-input-group">
    {label && <label className="ui-label">{label}</label>}
    <div className="ui-input-wrapper">
      {icon && <span className="ui-input-icon">{icon}</span>}
      <input 
        className={`ui-input ${icon ? 'ui-input-with-icon' : ''} ${error ? 'ui-input-error' : ''} ${className}`}
        {...props}
      />
    </div>
    {error && <span className="ui-error-text">{error}</span>}
    {helper && !error && <span className="ui-helper-text">{helper}</span>}
  </div>
);

export const Select = ({ 
  label, 
  error, 
  helper, 
  options = [],
  className = '',
  ...props 
}) => (
  <div className="ui-input-group">
    {label && <label className="ui-label">{label}</label>}
    <select 
      className={`ui-input ${error ? 'ui-input-error' : ''} ${className}`}
      {...props}
    >
      {options.map((option, index) => (
        <option key={index} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
    {error && <span className="ui-error-text">{error}</span>}
    {helper && !error && <span className="ui-helper-text">{helper}</span>}
  </div>
);

export const Textarea = ({ 
  label, 
  error, 
  helper,
  className = '',
  ...props 
}) => (
  <div className="ui-input-group">
    {label && <label className="ui-label">{label}</label>}
    <textarea 
      className={`ui-input ui-textarea ${error ? 'ui-input-error' : ''} ${className}`}
      {...props}
    />
    {error && <span className="ui-error-text">{error}</span>}
    {helper && !error && <span className="ui-helper-text">{helper}</span>}
  </div>
);

// ===== BADGES =====
export const Badge = ({ children, variant = 'secondary', className = '' }) => (
  <span className={`ui-badge ui-badge-${variant} ${className}`}>
    {children}
  </span>
);

// ===== ALERTS =====
export const Alert = ({ children, variant = 'info', icon, onClose, className = '' }) => (
  <div className={`ui-alert ui-alert-${variant} ${className}`}>
    {icon && <span className="ui-alert-icon">{icon}</span>}
    <div className="ui-alert-content">{children}</div>
    {onClose && (
      <button onClick={onClose} className="ui-alert-close">
        ×
      </button>
    )}
  </div>
);

// ===== MODAL =====
export const Modal = ({ isOpen, onClose, title, children, footer, className = '' }) => {
  if (!isOpen) return null;

  return (
    <div className="ui-modal-overlay" onClick={onClose}>
      <div className="ui-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ui-modal-header">
          <h2 className="ui-modal-title">{title}</h2>
          <button onClick={onClose} className="ui-modal-close">
            ×
          </button>
        </div>
        <div className="ui-modal-body">
          {children}
        </div>
        {footer && (
          <div className="ui-modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

// ===== TABLE =====
export const Table = ({ children, className = '' }) => (
  <div className="ui-table-container">
    <table className={`ui-table ${className}`}>
      {children}
    </table>
  </div>
);

export const TableHeader = ({ columns }) => (
  <thead>
    <tr>
      {columns.map((col, index) => (
        <th key={index} className="ui-table-th">
          {col}
        </th>
      ))}
    </tr>
  </thead>
);

export const TableRow = ({ children, onClick, className = '' }) => (
  <tr 
    className={`ui-table-tr ${onClick ? 'ui-table-tr-clickable' : ''} ${className}`}
    onClick={onClick}
  >
    {children}
  </tr>
);

export const TableCell = ({ children, className = '' }) => (
  <td className={`ui-table-td ${className}`}>
    {children}
  </td>
);

// ===== LOADING =====
export const Spinner = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };
  
  return (
    <div className={`ui-spinner ${sizes[size]} ${className}`}></div>
  );
};

export const Loading = ({ text = 'Cargando...', className = '' }) => (
  <div className={`ui-loading ${className}`}>
    <Spinner />
    {text && <p className="ui-loading-text">{text}</p>}
  </div>
);

// ===== FAB =====
export const FAB = ({ icon, onClick, className = '', ...props }) => (
  <button className={`ui-fab ${className}`} onClick={onClick} {...props}>
    {icon}
  </button>
);

// ===== EMPTY STATE =====
export const EmptyState = ({ icon, title, description, action, className = '' }) => (
  <div className={`ui-empty-state ${className}`}>
    {icon && <div className="ui-empty-state-icon">{icon}</div>}
    <h3 className="ui-empty-state-title">{title}</h3>
    {description && <p className="ui-empty-state-description">{description}</p>}
    {action && <div className="ui-empty-state-action">{action}</div>}
  </div>
);

// ===== STAT CARD =====
export const StatCard = ({ icon, label, value, trend, trendValue, className = '' }) => (
  <Card className={`ui-stat-card ${className}`}>
    <div className="ui-stat-card-header">
      {icon && <div className="ui-stat-card-icon">{icon}</div>}
      <span className="ui-stat-card-label">{label}</span>
    </div>
    <div className="ui-stat-card-value">{value}</div>
    {trend && (
      <div className={`ui-stat-card-trend ui-stat-card-trend-${trend}`}>
        {trendValue}
      </div>
    )}
  </Card>
);

export default {
  Button,
  IconButton,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Input,
  Select,
  Textarea,
  Badge,
  Alert,
  Modal,
  Table,
  TableHeader,
  TableRow,
  TableCell,
  Spinner,
  Loading,
  FAB,
  EmptyState,
  StatCard
};
