'use client'

import { forwardRef, useState } from 'react'

interface WaveInputProps {
  label: string
  type?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  required?: boolean
  className?: string
  name?: string
  minLength?: number
}

const WaveInput = forwardRef<HTMLInputElement, WaveInputProps>(({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  className = '',
  name,
  minLength
}, ref) => {
  const labelChars = label.split('')

  return (
    <div className={`wave-group ${className}`}>
      <input
        ref={ref}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        name={name}
        minLength={minLength}
        className="wave-input"
      />
      <label className="wave-label">
        {labelChars.map((char, index) => (
          <span
            key={index}
            className="wave-label-char"
            style={{ '--index': index } as React.CSSProperties}
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
        ))}
      </label>
      <div className="wave-bar"></div>
      <style jsx>{`
        .wave-group {
          position: relative;
          margin-bottom: 2rem;
        }

        .wave-group .wave-input {
          font-size: 16px;
          padding: 10px 10px 10px 5px;
          display: block;
          width: 100%;
          border: none;
          border-bottom: 1px solid #515151;
          background: transparent;
          border-radius: 0;
          outline: none;
        }

        .wave-group .wave-input:focus {
          outline: none;
          box-shadow: none;
          border-color: #515151;
        }

        .wave-group .wave-label {
          color: #999;
          font-size: 18px;
          font-weight: normal;
          position: absolute;
          pointer-events: none;
          left: 5px;
          top: 10px;
          display: flex;
        }

        .wave-group .wave-label-char {
          transition: 0.2s ease all;
          transition-delay: calc(var(--index) * .05s);
        }

        .wave-group .wave-input:focus ~ label .wave-label-char,
        .wave-group .wave-input:not(:placeholder-shown) ~ label .wave-label-char {
          transform: translateY(-20px);
          font-size: 14px;
          color: #5264AE;
        }

        .wave-group .wave-bar {
          position: relative;
          display: block;
          width: 100%;
        }

        .wave-group .wave-bar:before,
        .wave-group .wave-bar:after {
          content: '';
          height: 2px;
          width: 0;
          bottom: 1px;
          position: absolute;
          background: #5264AE;
          transition: 0.2s ease all;
          -moz-transition: 0.2s ease all;
          -webkit-transition: 0.2s ease all;
        }

        .wave-group .wave-bar:before {
          left: 50%;
        }

        .wave-group .wave-bar:after {
          right: 50%;
        }

        .wave-group .wave-input:focus ~ .wave-bar:before,
        .wave-group .wave-input:focus ~ .wave-bar:after {
          width: 50%;
        }
      `}</style>
    </div>
  )
})

WaveInput.displayName = 'WaveInput'

export default WaveInput
