# Whisper Transcriber Implementation Plan

## Overview

This document outlines the comprehensive plan to fix the 500 error issues with the Whisper Transcriber application and ensure it works reliably on Netlify.

## Root Cause Analysis

The 500 errors are likely caused by one or more of the following issues:

1. **OpenAI API Integration Issues**:
   - Incorrect request format or parameters
   - File size limitations
   - Content-Type handling problems

2. **Netlify Function Configuration**:
   - Edge Function limitations with file uploads
   - Timeout constraints
   - Memory limitations

3. **Error Handling Deficiencies**:
   - Insufficient error reporting
   - Lack of detailed logging
   - No retry mechanisms

## Implementation Steps

### 1. Replace Edge Function with Regular Netlify Function

**Files to Replace**:
- `netlify/functions/transcribe-robust.js` (new file)
- `netlify.toml` (update)

**Key Improvements**:
- Better file handling with multer
- Detailed error logging
- Proper request construction
- Explicit content-type handling

### 2. Enhance Client-Side Implementation

**Files to Replace**:
- `client/src/App.jsx` (update)
- `client/src/styles.css` (update)
- `client/src/main.jsx` (update)

**Key Improvements**:
- File validation (type and size)
- Better error display with details
- Retry mechanism for transient errors
- Health indicator component

### 3. Add Health Check Endpoint

**Files to Add**:
- `netlify/functions/health-check.js` (new file)

**Key Improvements**:
- API connectivity verification
- Configuration validation
- Detailed status reporting

### 4. Update Dependencies

**Files to Add/Update**:
- `netlify/functions/package.json` (new file)

**Key Dependencies**:
- form-data
- multer
- node-fetch

## Deployment Instructions

1. **Backup Current Files**:
   ```bash
   cp netlify/functions/transcribe.js netlify/functions/transcribe.js.backup
   cp netlify.toml netlify.toml.backup
   cp client/src/App.jsx client/src/App.jsx.backup
   cp client/src/styles.css client/src/styles.css.backup
   cp client/src/main.jsx client/src/main.jsx.backup
   ```

2. **Replace Files**:
   ```bash
   # Replace existing files
   mv netlify.toml.new netlify.toml
   mv client/src/App.jsx.new client/src/App.jsx
   mv client/src/styles.css.new client/src/styles.css
   mv client/src/main.jsx.new client/src/main.jsx
   
   # Add new files
   # (netlify/functions/transcribe-robust.js already created)
   # (netlify/functions/health-check.js already created)
   # (netlify/functions/package.json already created)
   ```

3. **Install Dependencies**:
   ```bash
   cd netlify/functions
   npm install
   cd ../..
   ```

4. **Build and Deploy**:
   ```bash
   npm run build
   # Deploy to Netlify using your preferred method
   ```

## Verification Steps

1. **Check Health Endpoint**:
   - Visit `https://transcribe.wtpnews.org/api/health`
   - Verify API connectivity status

2. **Test Small File Transcription**:
   - Upload a small audio file (< 1MB)
   - Verify successful transcription

3. **Test Medium File Transcription**:
   - Upload a medium audio file (1-10MB)
   - Verify successful transcription

4. **Check Error Handling**:
   - Upload an invalid file type
   - Verify proper error message
   - Upload a file exceeding size limit
   - Verify proper error message

## Troubleshooting

If issues persist after deployment:

1. **Check Netlify Function Logs**:
   - Review logs in Netlify dashboard
   - Look for specific error messages

2. **Verify API Key**:
   - Ensure OPENAI_API_KEY environment variable is correctly set
   - Verify API key has proper permissions

3. **Test API Directly**:
   - Use a tool like Postman to test OpenAI API directly
   - Verify the API key works with the same parameters

4. **Adjust Timeout Settings**:
   - If timeouts occur with larger files, increase the function timeout in netlify.toml

## Maintenance Plan

1. **Regular Health Checks**:
   - The application now includes an automatic health check indicator
   - Monitor this indicator for API status

2. **Error Monitoring**:
   - Review logs periodically for error patterns
   - Address common errors with targeted fixes

3. **Future Enhancements**:
   - Consider implementing client-side transcription for smaller files
   - Add support for batch processing
   - Implement user accounts for saving transcriptions