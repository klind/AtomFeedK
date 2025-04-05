/**
 * Get the HTML content for the Swagger login page
 * @returns {string} - HTML content
 */
const getSwaggerLoginHtml = () => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API Documentation - Authentication</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    h1 {
      color: #2c3e50;
      border-bottom: 1px solid #eee;
      padding-bottom: 10px;
    }
    .container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .card {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .card h2 {
      margin-top: 0;
      color: #3498db;
    }
    input[type="text"], input[type="password"] {
      width: 100%;
      padding: 10px;
      margin: 8px 0;
      border: 1px solid #ddd;
      border-radius: 4px;
      box-sizing: border-box;
    }
    button {
      background-color: #3498db;
      color: white;
      border: none;
      padding: 10px 15px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
    }
    button:hover {
      background-color: #2980b9;
    }
    .error {
      color: #e74c3c;
      margin-top: 10px;
    }
    .success {
      color: #27ae60;
      margin-top: 10px;
    }
    .loading {
      display: none;
      margin-top: 10px;
    }
    .spinner {
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 3px solid rgba(0, 0, 0, 0.1);
      border-radius: 50%;
      border-top-color: #3498db;
      animation: spin 1s ease-in-out infinite;
      margin-right: 10px;
      vertical-align: middle;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <h1>API Documentation - Authentication Required</h1>
  <p>You need to authenticate to access the API documentation. Choose one of the options below:</p>
  
  <div class="container">
    <div class="card">
      <h2>Option 1: Login with Cognito</h2>
      <form id="loginForm">
        <div>
          <label for="username">Username:</label>
          <input type="text" id="username" name="username" required>
        </div>
        <div>
          <label for="password">Password:</label>
          <input type="password" id="password" name="password" required>
        </div>
        <button type="submit">Login</button>
        <div id="loginLoading" class="loading">
          <span class="spinner"></span> Authenticating...
        </div>
        <div id="loginSuccess" class="success"></div>
        <div id="loginError" class="error"></div>
      </form>
    </div>
    
    <div class="card">
      <h2>Option 2: Provide JWT Token</h2>
      <form id="tokenForm">
        <div>
          <label for="token">JWT Token:</label>
          <input type="text" id="token" name="token" required>
        </div>
        <button type="submit">Submit Token</button>
        <div id="tokenLoading" class="loading">
          <span class="spinner"></span> Verifying token...
        </div>
        <div id="tokenSuccess" class="success"></div>
        <div id="tokenError" class="error"></div>
      </form>
    </div>
  </div>

  <script>
    // Login form submission
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      const errorElement = document.getElementById('loginError');
      const successElement = document.getElementById('loginSuccess');
      const loadingElement = document.getElementById('loginLoading');
      
      try {
        // Reset messages
        errorElement.textContent = '';
        successElement.textContent = '';
        
        // Show loading
        loadingElement.style.display = 'block';
        
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        // Hide loading
        loadingElement.style.display = 'none';
        
        if (!response.ok) {
          throw new Error(data.error || 'Login failed');
        }
        
        // Show success message
        successElement.textContent = 'Login successful! Redirecting to API documentation...';
        
        // Redirect to Swagger UI after a short delay
        setTimeout(() => {
          window.location.href = '/api-docs';
        }, 1500);
      } catch (error) {
        // Hide loading
        loadingElement.style.display = 'none';
        
        // Show error
        errorElement.textContent = error.message;
      }
    });
    
    // Token form submission
    document.getElementById('tokenForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const token = document.getElementById('token').value;
      const errorElement = document.getElementById('tokenError');
      const successElement = document.getElementById('tokenSuccess');
      const loadingElement = document.getElementById('tokenLoading');
      
      try {
        // Reset messages
        errorElement.textContent = '';
        successElement.textContent = '';
        
        // Show loading
        loadingElement.style.display = 'block';
        
        const response = await fetch('/api/auth/verify-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ token })
        });
        
        const data = await response.json();
        
        // Hide loading
        loadingElement.style.display = 'none';
        
        if (!response.ok) {
          throw new Error(data.error || 'Token verification failed');
        }
        
        // Show success message
        successElement.textContent = 'Token verified! Redirecting to API documentation...';
        
        // Set the token in a cookie
        document.cookie = \`swagger_token=\${token}; path=/; max-age=3600; SameSite=Strict\`;
        
        // Redirect to Swagger UI after a short delay
        setTimeout(() => {
          window.location.href = '/api-docs';
        }, 1500);
      } catch (error) {
        // Hide loading
        loadingElement.style.display = 'none';
        
        // Show error
        errorElement.textContent = error.message;
      }
    });
  </script>
</body>
</html>
`;
};

module.exports = {
  getSwaggerLoginHtml,
}; 