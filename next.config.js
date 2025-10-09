// This file exists to prevent Netlify from treating this as a Next.js app
module.exports = {
  // Explicitly disable Next.js features
  distDir: 'dist',
  // Disable all Next.js optimizations
  optimizeFonts: false,
  optimizeImages: false,
  // Ensure this is not treated as a Next.js app
  target: 'serverless',
}