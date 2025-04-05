import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../hooks/useAuth';
import Login from './Login';
import SignUp from './SignUp';
import VerificationForm from './VerificationForm';
/**
 * AuthWrapper Component
 * 
 * A higher-order component that handles authentication state and renders appropriate auth forms.
 * It wraps child components and only renders them if the user is authenticated.
 *
 * Features:
 * - Manages authentication state using useAuth hook
 * - Handles switching between Login and SignUp forms
 * - Manages verification flow after signup
 * - Shows loading state while checking auth status
 * - Provides success feedback after verification
 *
 * Props:
 * - children: React nodes to render when authenticated
 *
 * States:
 * - showSignUp: Boolean to toggle between Login/SignUp forms
 * - showVerification: Boolean to show verification form
 * - userEmail: String to store email during verification flow  
 * - justVerified: Boolean for showing success message after verification
 *
 * Usage:
 * ```jsx
 * <AuthWrapper>
 *   <ProtectedComponent />
 * </AuthWrapper>
 * ```
 */

const AuthWrapper = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const [showSignUp, setShowSignUp] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [justVerified, setJustVerified] = useState(false);

  // Debug logging
  useEffect(() => {
  }, [showSignUp, showVerification, userEmail, justVerified, isAuthenticated, isLoading]);

  // This function will be called after successful signup
  const handleSignUpSuccess = (email) => {
    setUserEmail(email);
    setShowVerification(true);
  };

  // This function will be called after successful verification
  const handleVerificationSuccess = () => {
    setShowVerification(false);
    setShowSignUp(false);
    setJustVerified(true);
    
    // Clear the justVerified flag after 10 seconds
    setTimeout(() => {
      setJustVerified(false);
    }, 10000);
  };

  // Handle toggle between signup and login
  const toggleSignUp = () => {
    setShowVerification(false); // Reset verification state
    setJustVerified(false); // Reset just verified state
    setShowSignUp(!showSignUp);
  };

  // Handle cancel verification
  const handleCancelVerification = () => {
    setShowVerification(false);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64 bg-white dark:bg-gray-900 min-h-screen">
        <div className="w-8 h-8 border-4 border-gray-200 dark:border-gray-700 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
        <div className="container mx-auto p-4">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">HCM Atom Feed Records</h1>
            <p className="text-lg text-gray-700 dark:text-gray-300">Please sign in to access the application.</p>
          </div>
          
          {showVerification ? (
            <VerificationForm 
              email={userEmail}
              onSuccess={handleVerificationSuccess}
              onCancel={handleCancelVerification}
            />
          ) : showSignUp ? (
            <SignUp onSuccess={handleSignUpSuccess} />
          ) : (
            <Login 
              onSuccess={() => {}} 
              justVerified={justVerified}
              verifiedEmail={justVerified ? userEmail : ''}
            />
          )}
          
          {!showVerification && (
            <div className="mt-4 text-center">
              <button
                onClick={toggleSignUp}
                className="text-indigo-600 dark:text-indigo-400 hover:underline bg-transparent border-none cursor-pointer"
              >
                {showSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Render the protected content */}
      {children}
    </>
  );
};

AuthWrapper.propTypes = {
  children: PropTypes.node.isRequired
};

export default AuthWrapper; 