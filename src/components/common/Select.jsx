import React, { forwardRef } from 'react';

export const Select = forwardRef(({
  label,
  name,
  value,
  onChange,
  options = [],
  placeholder = 'Select an option',
  error,
  helper,
  required = false,
  disabled = false,
  className = '',
  style = {}
}, ref) => {
  return (
    <div className={`form-group ${className}`} style={style}>
      {label && (
        <label className="form-label" htmlFor={name}>
          <span>
            {label}
            {required && <span className="form-label-required">*</span>}
          </span>
        </label>
      )}
      <select
        ref={ref}
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className="form-select"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => {
          const val = typeof opt === 'object' ? opt.value : opt;
          const lbl = typeof opt === 'object' ? opt.label : opt;
          return (
            <option key={val} value={val}>
              {lbl}
            </option>
          );
        })}
      </select>
      {error && <p className="form-error">{error}</p>}
      {helper && !error && <p className="form-helper">{helper}</p>}
    </div>
  );
});

Select.displayName = 'Select';
