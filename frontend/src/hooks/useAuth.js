import { useState, useEffect, createContext, useContext } from 'react';
import { fetchAuthSession, getCurrentUser, signUp as amplifySignUp, confirmSignUp as amplifyConfirmSignUp, signIn as amplifySignIn, signOut as amplifySignOut, resetPassword, confirmResetPassword, resendSignUpCode } from 'aws-amplify/auth';

// Create an authentication context
const AuthContext = createContext(null);

// Provider component that wraps your app and makes auth available to any child component
export const AuthProvider = ({ children }) => {
  const auth = useProvideAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};

// Hook for components to get the auth object and re-render when it changes
export const useAuth = () => {
  return useContext(AuthContext);
};

// Provider hook that creates the auth object and handles state
function useProvideAuth() {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        setIsAuthenticated(true);
        setError(null);
      } catch (err) {
        setUser(null);
        setIsAuthenticated(false);
        // Don't set error here as this is a normal state when not logged in
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Sign up a new user
  const signUp = async (email, password) => {
    setIsLoading(true);
    setError(null);
    try {
      // Backend validation for tv2.dk email domain
      if (!email.endsWith('@tv2.dk')) {
        throw new Error('Email must end with @tv2.dk');
      }
      
      const result = await amplifySignUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email
          }
        }
      });
      
      return result;
    } catch (err) {
      console.error('Sign up error in useAuth hook:', err);
      console.error('Error details:', {
        name: err.name,
        message: err.message,
        code: err.code,
        stack: err.stack
      });
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Confirm sign up with verification code
  const confirmSignUp = async (email, code) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await amplifyConfirmSignUp({
        username: email,
        confirmationCode: code
      });
      
      return result;
    } catch (err) {
      console.error('Confirm sign up error:', err);
      console.error('Error details:', {
        name: err.name,
        message: err.message,
        code: err.code,
        stack: err.stack
      });
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Sign in a user
  const signIn = async (email, password) => {
    setIsLoading(true);
    setError(null);
    try {
      // Use the default SRP authentication flow now that it's enabled in Cognito
      const signInResult = await amplifySignIn({
        username: email,
        password
      });
      
      // Get the current user after sign in
      const currentUser = await getCurrentUser();
      
      setUser(currentUser);
      setIsAuthenticated(true);
      return currentUser;
    } catch (err) {
      console.error('Sign in error:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await amplifySignOut();
      setUser(null);
      setIsAuthenticated(false);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Get current session (includes tokens)
  const getCurrentSession = async () => {
    try {
      const session = await fetchAuthSession();
      return session;
    } catch (err) {
      throw err;
    }
  };

  // Get JWT token
  const getIdToken = async () => {
    try {
      const session = await fetchAuthSession();
      return session.tokens.idToken.toString();
    } catch (err) {
      throw err;
    }
  };

  // Reset password
  const forgotPassword = async (email) => {
    setIsLoading(true);
    setError(null);
    try {
      await resetPassword({
        username: email
      });
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Complete password reset
  const forgotPasswordSubmit = async (email, code, newPassword) => {
    setIsLoading(true);
    setError(null);
    try {
      await confirmResetPassword({
        username: email,
        confirmationCode: code,
        newPassword
      });
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Resend confirmation code
  const resendConfirmationCode = async (email) => {
    setIsLoading(true);
    setError(null);
    try {
      await resendSignUpCode({
        username: email
      });
      return true;
    } catch (err) {
      console.error('Resend confirmation code error:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    signUp,
    confirmSignUp,
    signIn,
    signOut,
    forgotPassword,
    forgotPasswordSubmit,
    getCurrentSession,
    getIdToken,
    resendConfirmationCode
  };
} 