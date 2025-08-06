# PackSafe Backend - Render Deployment

This backend is ready for deployment on Render.com

## Environment Variables Required in Render

Add these environment variables in your Render service settings:

```bash
NODE_ENV=production
PORT=10000
MONGODB_URI=your-mongodb-atlas-connection-string
JWT_SECRET=your-super-secret-jwt-key-for-production
CORS_ORIGIN=https://your-netlify-app.netlify.app
NPM_REGISTRY_URL=https://registry.npmjs.org
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Render Service Configuration

1. **Build Command**: `npm install && npm run build`
2. **Start Command**: `npm start`
3. **Environment**: Node.js
4. **Auto-Deploy**: Yes (from main branch)

## Database Setup

1. Create a MongoDB Atlas cluster
2. Get the connection string
3. Add it as MONGODB_URI in Render environment variables

## Deployment URL

Once deployed, your backend will be available at:
`https://your-render-service.onrender.com`

Update your VS Code extension and frontend to use this URL.
