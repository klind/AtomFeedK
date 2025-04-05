/**
 * Get the custom JavaScript for Swagger UI
 * @param {string} token - JWT token for authentication
 * @returns {string} - Custom JavaScript
 */
const getCustomSwaggerJs = (token) => {
  return `
    (function() {
      function addLogoutButton() {
        // Set the token in the Authorize dialog
        if ('${token}' && window.ui) {
          window.ui.preauthorizeApiKey("bearerAuth", "${token}");
        }
        
        // Add logout button if it doesn't exist already
        if (!document.querySelector('.logout-btn')) {
          // Find the Authentication Documentation section
          const sections = document.querySelectorAll('.swagger-ui .information-container');
          if (sections.length > 0) {
            const container = sections[0];
            
            // Create a div for the logout button with centered styling
            const logoutContainer = document.createElement('div');
            logoutContainer.style.textAlign = 'center';
            logoutContainer.style.marginTop = '20px';
            logoutContainer.style.marginBottom = '20px';
            
            const logoutBtn = document.createElement('button');
            logoutBtn.className = 'btn logout-btn';
            logoutBtn.textContent = 'Logout';
            logoutBtn.style.backgroundColor = '#e74c3c';
            logoutBtn.style.color = 'white';
            logoutBtn.style.border = 'none';
            logoutBtn.style.borderRadius = '4px';
            logoutBtn.style.padding = '8px 20px';
            logoutBtn.style.cursor = 'pointer';
            logoutBtn.style.fontSize = '14px';
            logoutBtn.style.fontWeight = 'bold';
            
            logoutBtn.addEventListener('click', async function() {
              try {
                // Call the logout endpoint
                const response = await fetch('/api/auth/logout', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  }
                });
                
                if (!response.ok) {
                  throw new Error('Logout failed');
                }
                
                // Redirect to login page
                window.location.href = '/swagger-login.html';
              } catch (error) {
                console.error('Logout error:', error);
                alert('Failed to logout. Please try again.');
              }
            });
            
            // Add hover effect
            logoutBtn.addEventListener('mouseover', function() {
              this.style.backgroundColor = '#c0392b';
            });
            logoutBtn.addEventListener('mouseout', function() {
              this.style.backgroundColor = '#e74c3c';
            });
            
            logoutContainer.appendChild(logoutBtn);
            container.appendChild(logoutContainer);
          }
        }
      }

      // Try to add the button when the DOM is ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
          // Try multiple times with increasing delays
          setTimeout(addLogoutButton, 100);
          setTimeout(addLogoutButton, 500);
          setTimeout(addLogoutButton, 1000);
          setTimeout(addLogoutButton, 2000);
        });
      } else {
        // Try multiple times with increasing delays
        setTimeout(addLogoutButton, 100);
        setTimeout(addLogoutButton, 500);
        setTimeout(addLogoutButton, 1000);
        setTimeout(addLogoutButton, 2000);
      }
    })();
  `;
};

module.exports = {
  getCustomSwaggerJs,
}; 