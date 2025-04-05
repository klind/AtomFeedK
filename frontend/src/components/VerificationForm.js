import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../hooks/useAuth';

const VerificationForm = ({ email, onSuccess, onCancel }) => {
  const { confirmSignUp, resendConfirmationCode, isLoading, error } = useAuth();
  const [verificationCode, setVerificationCode] = useState('');
  const [localError, setLocalError] = useState('');
  const [resendSuccess, setResendSuccess] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    setLocalError('');
    setVerificationSuccess(false);

    // Validate the verification code format
    if (!verificationCode || verificationCode.trim() === '') {
      setLocalError('Verification code is required');
      return;
    }

    try {
      // Trim the verification code to remove any whitespace
      const cleanCode = verificationCode.trim();
      
      await confirmSignUp(email, cleanCode);
      
      // Show success message before redirecting
      setVerificationSuccess(true);
      setLocalError('');
      
      // Delay the redirect slightly to show the success message
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (err) {
      console.error('Verification error caught in component:', err);
      setLocalError(err.message || 'Failed to verify account');
    }
  };

  const resendVerificationCode = async () => {
    try {
      await resendConfirmationCode(email);
      setResendSuccess(true);
      setLocalError('');
      // Clear the success message after 5 seconds
      setTimeout(() => {
        setResendSuccess(false);
      }, 5000);
    } catch (err) {
      setLocalError(err.message || 'Failed to resend verification code');
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 transition-colors">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Verify Your Account</h2>
      
      {error && (
        <div className="p-3 mb-4 rounded bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100">
          {error}
        </div>
      )}
      
      {localError && (
        <div className="p-3 mb-4 rounded bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100">
          {localError}
        </div>
      )}
      
      {resendSuccess && (
        <div className="p-3 mb-4 rounded bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100">
          Verification code resent to your email.
        </div>
      )}
      
      {verificationSuccess && (
        <div className="p-3 mb-4 rounded bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100">
          Account verified successfully! Redirecting to login...
        </div>
      )}
      
      <form onSubmit={handleVerify}>
        <p className="mb-4 text-gray-700 dark:text-gray-300">
          We've sent a verification code to <strong className="text-gray-900 dark:text-white">{email}</strong>. Please enter it below to verify your account.
        </p>
        
        <div className="mb-4">
          <label className="block mb-2 text-gray-900 dark:text-white">Verification Code</label>
          <input
            type="text"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </div>
        
        <div className="text-center mb-3">
          <button
            type="submit"
            disabled={isLoading}
            className={`w-1/2 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded transition-colors ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Verifying...' : 'Verify Account'}
          </button>
        </div>
        
        <div className="text-center mt-3 flex justify-center space-x-4">
          <button
            type="button"
            onClick={resendVerificationCode}
            className="text-indigo-600 dark:text-indigo-400 hover:underline bg-transparent border-none cursor-pointer"
          >
            Resend verification code
          </button>
          
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="text-gray-600 dark:text-gray-400 hover:underline bg-transparent border-none cursor-pointer"
            >
              Back to Sign Up
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

VerificationForm.propTypes = {
  email: PropTypes.string.isRequired,
  onSuccess: PropTypes.func.isRequired,
  onCancel: PropTypes.func
};

export default VerificationForm; 