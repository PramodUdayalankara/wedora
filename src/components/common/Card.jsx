import React from 'react';

export const Card = ({ children, className = '', style = {}, onClick }) => {
  return (
    <div className={`card ${className}`} style={style} onClick={onClick}>
      {children}
    </div>
  );
};

export const CardHeader = ({ title, subtitle, action, className = '' }) => {
  return (
    <div className={`card-header ${className}`}>
      <div>
        {title && <h3 className="card-title">{title}</h3>}
        {subtitle && <p className="card-subtitle">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};

export const CardBody = ({ children, className = '', style = {} }) => {
  return (
    <div className={`card-body ${className}`} style={style}>
      {children}
    </div>
  );
};

export const CardFooter = ({ children, className = '' }) => {
  return <div className={`card-footer ${className}`}>{children}</div>;
};
