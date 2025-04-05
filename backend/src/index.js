// Import configuration first and load environment variables
const config = require('./config/env');
config.loadEnv(); // Load environment variables

// Now import other modules
const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const swaggerUi = require('swagger-ui-express');
const { setupSwagger, generateSwaggerHtml } = require('./swagger');
const swaggerAuthMiddleware = require('./middleware/swaggerAuth');
const { setupRoutes } = require('./routes');
const logger = require('./config/logger');

// Initialize Express app
const app = express();
const PORT = config.PORT;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  credentials: true,
  origin: true
}));

app.options('*', cors({
  credentials: true,
  origin: true
}));

// Add cookie parser middleware
app.use(cookieParser());

// Setup Swagger UI
setupSwagger(app);

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// API Documentation with authentication
app.use('/api-docs', swaggerAuthMiddleware, swaggerUi.serve, (req, res) => {
  // Get the token from the cookie
  const token = req.cookies?.swagger_token;
  
  // Generate Swagger HTML with the token
  const swaggerHtml = generateSwaggerHtml(token);
  
  res.send(swaggerHtml);
});

// Setup all routes
setupRoutes(app);

// Start the server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`API Documentation available at http://localhost:${PORT}/api-docs`);
}); 