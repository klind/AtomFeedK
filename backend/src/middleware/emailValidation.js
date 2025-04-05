/**
 * Middleware to validate email domains for Cognito operations
 * This ensures that only emails with the tv2.dk domain can register
 */

// Validate email domain
const validateEmailDomain = (email) => {
  if (!email) return false;
  return email.endsWith('@tv2.dk');
};

// Middleware for validating email in request body
const validateEmailMiddleware = (req, res, next) => {
  const { email, username } = req.body;
  
  // Check email from either email or username field (Cognito often uses username for email)
  const emailToValidate = email || username;
  
  if (!emailToValidate) {
    return res.status(400).json({
      message: 'Validation error',
      error: 'Email is required',
    });
  }
  
  if (!validateEmailDomain(emailToValidate)) {
    return res.status(400).json({
      message: 'Validation error',
      error: 'Email must end with @tv2.dk',
    });
  }
  
  next();
};

module.exports = {
  validateEmailMiddleware,
  validateEmailDomain
}; 