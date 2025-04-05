const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('../config/swagger');
const { getCustomSwaggerJs } = require('./templates/customJs');

/**
 * Generate HTML for Swagger UI with custom JS
 * @param {string} token - JWT token for authentication
 * @returns {string} - Generated HTML
 */
const generateSwaggerHtml = (token) => {
  const customJs = getCustomSwaggerJs(token);
  
  // Generate the base HTML
  const html = swaggerUi.generateHTML(swaggerSpecs, {
    customSiteTitle: "API Documentation (Authenticated)",
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      tryItOutEnabled: true,
      docExpansion: 'list'
    }
  });

  // Insert our custom JavaScript right before the closing body tag
  return html.replace(
    '</body>',
    `<script type="text/javascript">${customJs}</script></body>`
  );
};

module.exports = {
  generateSwaggerHtml,
}; 