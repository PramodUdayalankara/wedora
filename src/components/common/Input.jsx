import React, { forwardRef } from 'react';

export const Input = forwardRef(({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  helper,
  required = false,
  disabled = false,
  icon: Icon,
  min,
  max,
  step,
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
      <div className={Icon ? 'input-icon-wrapper' : ''}>
        {Icon && <Icon size={16} className="input-icon" />}
        <input
          ref={ref}
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          min={min}
          max={max}
          step={step}
          className={`form-input ${Icon ? 'input-with-icon' : ''} ${error ? 'border-red-500' : ''}`}
        />
      </div>
      {error && <p className="form-error">{error}</p>}
      {helper && !error && <p className="form-helper">{helper}</p>}
    </div>
  );
});

Input.displayName = 'Input';

export const Textarea = forwardRef(({
  label,
  name,
  value,
  onChange,
  placeholder,
  error,
  helper,
  required = false,
  disabled = false,
  rows = 3,
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
      <textarea
        ref={ref}
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        rows={rows}
        className={`form-textarea ${error ? 'border-red-500' : ''}`}
      />
      {error && <p className="form-error">{error}</p>}
      {helper && !error && <p className="form-helper">{helper}</p>}
    </div>
  );
});

Textarea.displayName = 'Textarea';
