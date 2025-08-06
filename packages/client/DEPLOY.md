# PackSafe Frontend - Netlify Deployment

This React app is ready for deployment on Netlify.

## Netlify Build Settings

1. **Build Command**: `npm run build`
2. **Publish Directory**: `dist`
3. **Node Version**: `18`

## Environment Variables

Add these in Netlify Site Settings > Environment Variables:

```bash
VITE_API_BASE_URL=https://your-render-service.onrender.com
VITE_APP_NAME=PackSafe
```

## Deployment Steps

### Option 1: Git-based Deployment (Recommended)

1. Push your code to GitHub
2. Connect Netlify to your GitHub repo
3. Set build settings above
4. Deploy automatically on push

### Option 2: Manual Deployment

1. Run `npm run build` locally
2. Upload the `dist` folder to Netlify
3. Configure environment variables

## Custom Domain (Optional)

After deployment, you can:

1. Add a custom domain in Netlify settings
2. Netlify will provide HTTPS automatically
3. Update CORS_ORIGIN in your Render backend

## Post-Deployment

Update these files with your live URLs:

- VS Code extension configuration
- README.md files
- Any hardcoded URLs
