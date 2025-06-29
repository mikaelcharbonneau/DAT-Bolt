import { useState } from 'react';
import { Upload, Barcode, MapPin } from 'lucide-react';
import { FormField as FormFieldType } from '../../types';

interface FormFieldProps {
  field: FormFieldType;
  value: unknown;
  onChange: (id: string, value: unknown) => void;
}

const FormField = ({ field, value, onChange }: FormFieldProps) => {
  const [focused, setFocused] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    onChange(field.id, e.target.value);
  };

  const renderField = () => {
    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            id={field.id}
            value={value || ''}
            onChange={handleChange}
            placeholder={field.placeholder}
            required={field.required}
            className="form-input"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
        );
      case 'textarea':
        return (
          <textarea
            id={field.id}
            value={value || ''}
            onChange={handleChange}
            placeholder={field.placeholder}
            required={field.required}
            rows={4}
            className="form-input resize-none"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
        );
      case 'select':
        return (
          <select
            id={field.id}
            value={value || ''}
            onChange={handleChange}
            required={field.required}
            className="form-input"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          >
            <option value="">{field.placeholder || 'Select an option'}</option>
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      case 'barcode':
        return (
          <div className="relative">
            <input
              type="text"
              id={field.id}
              value={value || ''}
              onChange={handleChange}
              placeholder={field.placeholder}
              required={field.required}
              className="form-input pl-10"
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            />
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Barcode size={18} className={`${focused ? 'text-hpe-green-500' : 'text-gray-400'}`} />
            </div>
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex items-center px-3 text-hpe-green-500 hover:text-hpe-green-600"
            >
              <span className="text-xs font-medium">Scan</span>
            </button>
          </div>
        );
      case 'file':
        return (
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 hover:border-hpe-green-400 transition-colors">
            <div className="flex flex-col items-center">
              <Upload size={24} className="text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">
                <span className="text-hpe-green-500 font-medium">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-400 mt-1">
                PNG, JPG, PDF up to 10MB
              </p>
              <input
                id={field.id}
                type="file"
                className="hidden"
                onChange={() => {}} // We'd implement file handling here
              />
            </div>
          </div>
        );
      case 'location':
        return (
          <div className="relative">
            <input
              type="text"
              id={field.id}
              value={value || ''}
              onChange={handleChange}
              placeholder={field.placeholder}
              required={field.required}
              className="form-input pl-10"
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            />
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <MapPin size={18} className={`${focused ? 'text-hpe-green-500' : 'text-gray-400'}`} />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="mb-4">
      <label htmlFor={field.id} className="form-label">
        {field.label}
        {field.required && <span className="text-hpe-error-500 ml-1">*</span>}
      </label>
      {renderField()}
    </div>
  );
};

export default FormField;