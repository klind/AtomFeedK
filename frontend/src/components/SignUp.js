import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../hooks/useAuth';

const SignUp = ({ onSuccess }) => {
  const { signUp, isLoading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [emailError, setEmailError] = useState('');

  // Debug logging for component state
  useEffect(() => {
  }, [email, password, error, localError]);

  // Validate email format
  const validateEmail = (email) => {
    if (!email.endsWith('@tv2.dk')) {
      setEmailError('Email must end with @tv2.dk');
      return false;
    }
    setEmailError('');
    return true;
  };

  // Handle email change
  const handleEmailChange = (e) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    if (newEmail) {
      validateEmail(newEmail);
    } else {
      setEmailError('');
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLocalError('');
    setEmailError('');

    // Validate email format
    if (!validateEmail(email)) {
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    try {
      await signUp(email, password);
      
      // Call onSuccess with the email to trigger verification flow
      if (onSuccess) onSuccess(email);
    } catch (err) {
      console.error('Sign up error caught in component:', err);
      // Check if the error is because the user is already confirmed
      if (err.message && err.message.includes('already confirmed')) {
        // If user is already confirmed, just call onSuccess to proceed to login
        if (onSuccess) onSuccess(email);
        return;
      }
      setLocalError(err.message || 'Failed to sign up');
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 transition-colors">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Create Account</h2>
      
      {(error || localError) && (
        <div className="p-3 mb-4 rounded bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100">
          {error || localError}
        </div>
      )}
      
      <form onSubmit={(e) => {
          handleSignUp(e);
        }}
      >
        <div className="mb-4">
          <label className="block mb-2 text-gray-900 dark:text-white">Email</label>
          <input
            type="email"
            value={email}
            onChange={handleEmailChange}
            className={`w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${emailError ? 'border-red-500 dark:border-red-500' : ''}`}
            required
          />
          {emailError && (
            <p className="text-red-500 text-sm mt-1">{emailError}</p>
          )}
          <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">
            Email must end with @tv2.dk
          </p>
        </div>
        
        <div className="mb-4">
          <label className="block mb-2 text-gray-900 dark:text-white">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block mb-2 text-gray-900 dark:text-white">Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </div>
        
        <div className="text-center">
          <button
            type="submit"
            disabled={isLoading || emailError}
            className={`w-1/2 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded transition-colors mt-2 ${(isLoading || emailError) ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Signing up...' : 'Sign Up'}
          </button>
        </div>
      </form>
    </div>
  );
};

SignUp.propTypes = {
  onSuccess: PropTypes.func.isRequired
};

export default SignUp; 