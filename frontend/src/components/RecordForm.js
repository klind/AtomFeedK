import React, { useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { createRecord } from '../services/api';
import PropTypes from 'prop-types';
import { FEED_OPTIONS, OPERATION_OPTIONS, STATUS_OPTIONS, WORKER_OPTIONS } from '../utils/filterConfig';

const RecordForm = forwardRef(({ onRecordAdded }, ref) => {
  const [formData, setFormData] = useState({
    PersonId: '',
    Feed: 'empassignment',
    DMLOperation: 'INSERT',
    IsProcessed: false,
    WorkerType: 'EMP',
    ProcessedMessage: 'Initial record creation'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showNotification, setShowNotification] = useState(false);

  // Convert status options format to match the form data structure
  const isProcessedOptions = STATUS_OPTIONS.map(option => ({
    value: option.value === 'processed',
    label: option.label
  }));

  // Function to show success notification
  const showSuccessNotification = useCallback(() => {
    setShowNotification(true);
    setTimeout(() => {
      setShowNotification(false);
    }, 1000);
  }, []);

  // Expose the showSuccessNotification function to parent components
  useImperativeHandle(ref, () => ({
    showSuccessNotification
  }));

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'IsProcessed' ? value === 'true' : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await createRecord(formData);
      setFormData({
        PersonId: '',
        Feed: 'empassignment',
        DMLOperation: 'INSERT',
        IsProcessed: false,
        WorkerType: 'EMP',
        ProcessedMessage: 'Initial record creation'
      });
      showSuccessNotification();
      if (onRecordAdded) {
        onRecordAdded();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-gray-800 p-1 rounded-lg shadow border-2 dark:border-gray-700">
      <div className="grid grid-cols-5 gap-1 p-1">
        {/* Empty left column */}
        <div></div>

        {/* PersonId Field */}
        <div className="flex flex-col p-2">
          <label htmlFor="PersonId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Person ID
          </label>
          <input
            type="text"
            id="PersonId"
            name="PersonId"
            value={formData.PersonId}
            onChange={handleChange}
            required
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Feed Field */}
        <div className="flex flex-col p-2">
          <label htmlFor="Feed" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Feed
          </label>
          <select
            id="Feed"
            name="Feed"
            value={formData.Feed}
            onChange={handleChange}
            required
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          >
            {FEED_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* WorkerType Field */}
        <div className="flex flex-col p-2">
          <label htmlFor="WorkerType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Worker Type
          </label>
          <select
            id="WorkerType"
            name="WorkerType"
            value={formData.WorkerType}
            onChange={handleChange}
            required
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          >
            {WORKER_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Empty right column */}
        <div></div>

        {/* Empty left column */}
        <div></div>

        {/* DMLOperation Field */}
        <div className="flex flex-col p-2">
          <label htmlFor="DMLOperation" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            DML Operation
          </label>
          <select
            id="DMLOperation"
            name="DMLOperation"
            value={formData.DMLOperation}
            onChange={handleChange}
            required
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          >
            {OPERATION_OPTIONS.map(option => (
              <option key={option.value} value={option.value.toUpperCase()}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* IsProcessed Field */}
        <div className="flex flex-col p-2">
          <label htmlFor="IsProcessed" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Status
          </label>
          <select
            id="IsProcessed"
            name="IsProcessed"
            value={formData.IsProcessed.toString()}
            onChange={handleChange}
            required
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          >
            {isProcessedOptions.map(option => (
              <option key={option.value.toString()} value={option.value.toString()}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* ProcessedMessage Field */}
        <div className="flex flex-col p-2">
          <label htmlFor="ProcessedMessage" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Processed Message
          </label>
          <input
            type="text"
            id="ProcessedMessage"
            name="ProcessedMessage"
            value={formData.ProcessedMessage}
            onChange={handleChange}
            required
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Empty right column */}
        <div></div>

        {/* Empty columns for spacing */}
        <div></div>
        <div></div>
        {/* Success Notification - Row 3, Column 3 */}
        <div className="flex flex-col p-2">
          {showNotification && (
            <div className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-4 py-2 rounded-md flex items-center justify-center space-x-2 transition-all duration-500 ease-in-out">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium">Saved</span>
            </div>
          )}
        </div>

        {/* Save Button Column */}
        <div className="flex items-end p-2">
          <div className="flex justify-end w-full">
            <button
              type="submit"
              disabled={loading}
              className="w-1/2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {loading && (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <span>Save Record</span>
            </button>
          </div>
        </div>

        {/* Empty right column */}
        <div></div>
      </div>

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400 mt-2" role="alert">
          {error}
        </div>
      )}
    </form>
  );
});

RecordForm.propTypes = {
  onRecordAdded: PropTypes.func,
};

export default RecordForm; 