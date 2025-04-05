import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../hooks/useAuth';

const Login = ({ onSuccess, justVerified = false, verifiedEmail = '' }) => {
  const { signIn, isLoading, error } = useAuth();
  const [email, setEmail] = useState(verifiedEmail || '');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  // Set email from verifiedEmail when it changes
  useEffect(() => {
    if (verifiedEmail) {
      setEmail(verifiedEmail);
    }
  }, [verifiedEmail]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (!email || !password) {
      setLocalError('Please enter both email and password');
      return;
    }

    try {
      // Using default SRP authentication now that it's enabled in Cognito
      await signIn(email, password);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Login error:', err);
      setLocalError(err.message || 'Failed to sign in');
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 transition-colors">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Login</h2>
      
      {justVerified && (
        <div className="p-3 mb-4 rounded bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100">
          Your account has been verified successfully! You can now sign in.
        </div>
      )}
      
      {(error || localError) && (
        <div className="p-3 mb-4 rounded bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100">
          {error || localError}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block mb-2 text-gray-900 dark:text-white">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
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
        
        <div className="text-center">
          <button
            type="submit"
            disabled={isLoading}
            className={`w-1/2 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded transition-colors ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </div>
      </form>
    </div>
  );
};

Login.propTypes = {
  onSuccess: PropTypes.func,
  justVerified: PropTypes.bool,
  verifiedEmail: PropTypes.string
};

export default Login; 