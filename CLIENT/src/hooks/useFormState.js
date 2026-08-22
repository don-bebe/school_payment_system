import { useState, useCallback, useMemo } from 'react';

export default function useFormState(initialValues = {}) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});

  // set(key) → onChange handler (works with <input> events or raw values)
  const set = useCallback((key) => (eOrValue) => {
    const value = eOrValue?.target !== undefined ? eOrValue.target.value : eOrValue;
    setValues(prev => ({ ...prev, [key]: value }));
    // Clear the error for this field on change
    setErrors(prev => ({ ...prev, [key]: null }));
  }, []);

  // Programmatic single-field update
  const setField = useCallback((key, value) => {
    setValues(prev => ({ ...prev, [key]: value }));
  }, []);

  // Bulk update (merge)
  const merge = useCallback((partial) => {
    setValues(prev => ({ ...prev, ...partial }));
  }, []);

  // Reset to initial values
  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
  }, [initialValues]);

  // Run a validator schema: (values) => { field: errorMsg | null }
  // Returns true if no errors
  const validate = useCallback((schema) => {
    if (typeof schema !== 'function') return true;
    const result = schema(values);
    setErrors(result ?? {});
    return !Object.values(result ?? {}).some(Boolean);
  }, [values]);

  const clearErrors = useCallback(() => setErrors({}), []);

  // isDirty: any value differs from initialValues
  const isDirty = useMemo(() => {
    return Object.keys(initialValues).some(k => values[k] !== initialValues[k]);
  }, [values, initialValues]);

  return {
    values,
    errors,
    isDirty,
    set,
    setField,
    merge,
    reset,
    validate,
    clearErrors,
    // Convenience: spread into <form> to get all values at once
    formProps: values,
  };
}
