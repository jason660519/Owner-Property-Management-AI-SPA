'use client';

import { AU_MARKET, type AustralianState } from '@/lib/market';

export interface AUAddressValue {
  streetNumber: string;
  streetName: string;
  suburb: string;
  state: AustralianState | '';
  postcode: string;
}

interface AUAddressInputProps {
  value: AUAddressValue;
  onChange: (value: AUAddressValue) => void;
  disabled?: boolean;
  required?: boolean;
}

// Input style shared across all fields
const fieldClass =
  'w-full px-3 py-2.5 rounded-lg bg-bg-tertiary border border-border-default ' +
  'text-text-primary placeholder:text-text-muted text-sm ' +
  'focus:outline-none focus:border-accent transition-colors ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

const labelClass = 'block text-xs font-medium text-text-secondary mb-1';

export default function AUAddressInput({
  value,
  onChange,
  disabled = false,
  required = false,
}: AUAddressInputProps) {
  const update = (field: keyof AUAddressValue) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => onChange({ ...value, [field]: e.target.value });

  return (
    <fieldset className="space-y-3" disabled={disabled}>
      <legend className="text-sm font-semibold text-text-primary mb-3">Property Address</legend>

      {/* Street number + Street name side by side */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>
            Street No.{required && <span className="text-error ml-0.5">*</span>}
          </label>
          <input
            type="text"
            placeholder="42"
            value={value.streetNumber}
            onChange={update('streetNumber')}
            required={required}
            className={fieldClass}
          />
        </div>
        <div className="col-span-2">
          <label className={labelClass}>
            Street Name{required && <span className="text-error ml-0.5">*</span>}
          </label>
          <input
            type="text"
            placeholder="Main Street"
            value={value.streetName}
            onChange={update('streetName')}
            required={required}
            className={fieldClass}
          />
        </div>
      </div>

      {/* Suburb */}
      <div>
        <label className={labelClass}>
          Suburb{required && <span className="text-error ml-0.5">*</span>}
        </label>
        <input
          type="text"
          placeholder="e.g. Surry Hills"
          value={value.suburb}
          onChange={update('suburb')}
          required={required}
          className={fieldClass}
        />
      </div>

      {/* State + Postcode side by side */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>
            State{required && <span className="text-error ml-0.5">*</span>}
          </label>
          <select
            value={value.state}
            onChange={update('state')}
            required={required}
            className={fieldClass}
          >
            <option value="">Select state</option>
            {AU_MARKET.states.map((s) => (
              <option key={s.code} value={s.code}>
                {s.code} — {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>
            Postcode{required && <span className="text-error ml-0.5">*</span>}
          </label>
          <input
            type="text"
            placeholder="2000"
            maxLength={4}
            pattern="\d{4}"
            value={value.postcode}
            onChange={update('postcode')}
            required={required}
            className={fieldClass}
          />
        </div>
      </div>

      {/* Formatted preview */}
      {(value.streetNumber || value.streetName || value.suburb) && (
        <p className="text-xs text-text-muted mt-1">
          Preview:{' '}
          <span className="text-text-secondary">
            {[
              value.streetNumber && value.streetName
                ? `${value.streetNumber} ${value.streetName}`
                : value.streetName,
              value.suburb,
              value.state && value.postcode
                ? `${value.state} ${value.postcode}`
                : value.state || value.postcode,
            ]
              .filter(Boolean)
              .join(', ')}
          </span>
        </p>
      )}
    </fieldset>
  );
}
