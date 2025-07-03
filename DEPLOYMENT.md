# Deployment Guide

## 🚀 Quick Deployment Options

### Option 1: Vercel (Recommended for Frontend)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy**
   ```bash
   vercel --prod
   ```

3. **Environment Variables**
   - Add in Vercel dashboard under Settings > Environment Variables
   - `VITE_API_URL`: Your backend API URL
   - `VITE_WEBSOCKET_URL`: Your WebSocket server URL

### Option 2: Netlify

1. **Build the project**
   ```bash
   npm run build
   ```

2. **Deploy to Netlify**
   - Drag and drop the `dist` folder to Netlify
   - Or connect your GitHub repository

### Option 3: Docker Production

1. **Create production Dockerfile**
   ```dockerfile
   FROM node:18-alpine AS builder
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY . .
   RUN npm run build

   FROM nginx:alpine
   COPY --from=builder /app/dist /usr/share/nginx/html
   COPY nginx.conf /etc/nginx/nginx.conf
   EXPOSE 80
   CMD ["nginx", "-g", "daemon off;"]
   ```

2. **Build and run**
   ```bash
   docker build -t whatsapp-frontend .
   docker run -p 80:80 whatsapp-frontend
   ```

## 🔧 Environment Configuration

### Production Environment Variables
```env
VITE_API_URL=https://your-api-domain.com
VITE_WEBSOCKET_URL=https://your-websocket-domain.com
VITE_MOCK_MODE=false
VITE_ENABLE_ANALYTICS=true
VITE_SENTRY_DSN=your-sentry-dsn
```

## 📊 Performance Optimization

### Build Optimization
```bash
# Analyze bundle size
npm run build:analyze

# Check for unused dependencies
npx depcheck

# Optimize images
npx imagemin src/assets/* --out-dir=dist/assets
```

### CDN Configuration
- Use CDN for static assets
- Enable gzip compression
- Set proper cache headers
- Implement service worker for offline support

## 🔒 Security Checklist

- [ ] Enable HTTPS
- [ ] Set up CSP headers
- [ ] Configure CORS properly
- [ ] Remove console.logs in production
- [ ] Implement rate limiting
- [ ] Use environment variables for secrets
- [ ] Enable security headers

## 📈 Monitoring

### Error Tracking
```javascript
// Sentry configuration
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
});
```

### Analytics
```javascript
// Google Analytics
import { gtag } from 'ga-gtag';

gtag('config', import.meta.env.VITE_GA_TRACKING_ID);
```

## 🚨 Troubleshooting

### Common Issues

1. **Build fails with memory error**
   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" npm run build
   ```

2. **Environment variables not working**
   - Ensure variables start with `VITE_`
   - Check `.env` file is in root directory
   - Restart development server

3. **Socket connection fails in production**
   - Check WebSocket URL is correct
   - Ensure HTTPS for secure connections
   - Verify CORS settings

## 📱 Mobile App Deployment

### React Native (Optional)
```bash
# Build for iOS
cd mobile && npx react-native run-ios --configuration Release

# Build for Android
cd mobile && npx react-native run-android --variant=release
```

### PWA Configuration
```javascript
// vite.config.js
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ]
});
```