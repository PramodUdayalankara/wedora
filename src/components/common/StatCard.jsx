import React from 'react';

export const StatCard = ({
  label,
  value,
  subtext,
  icon: Icon,
  accent = 'gold', // 'gold', 'navy', 'emerald', 'rose', 'amber'
  iconBg = 'var(--gold-100)',
  iconColor = 'var(--gold-600)',
  onClick
}) => {
  return (
    <div
      className={`stat-card stat-card-${accent}`}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {subtext && <div className="stat-subtext">{subtext}</div>}
      </div>
      {Icon && (
        <div className="stat-icon-wrapper" style={{ backgroundColor: iconBg }}>
          <Icon size={22} color={iconColor} />
        </div>
      )}
    </div>
  );
};
