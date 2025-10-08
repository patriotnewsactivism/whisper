const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  getUsageStats,
  getUsage,
  trackTranscription,
  trackAPICall,
  trackStorage,
  trackAIRequest,
  trackFeature
} = require('../services/usage-service');

/**
 * Get current usage statistics
 */
router.get('/stats', authenticate, (req, res) => {
  try {
    const stats = getUsageStats(req.user.userId);
    
    if (!stats) {
      return res.status(404).json({
        error: 'Usage not found',
        message: 'Usage tracking not initialized'
      });
    }
    
    res.json(stats);
  } catch (error) {
    console.error('Error getting usage stats:', error);
    res.status(500).json({
      error: 'Failed to get usage stats',
      message: error.message
    });
  }
});

/**
 * Get detailed usage
 */
router.get('/details', authenticate, (req, res) => {
  try {
    const usage = getUsage(req.user.userId);
    
    if (!usage) {
      return res.status(404).json({
        error: 'Usage not found',
        message: 'Usage tracking not initialized'
      });
    }
    
    res.json({ usage });
  } catch (error) {
    console.error('Error getting usage details:', error);
    res.status(500).json({
      error: 'Failed to get usage details',
      message: error.message
    });
  }
});

/**
 * Track transcription usage (internal endpoint)
 */
router.post('/track/transcription', authenticate, (req, res) => {
  try {
    const { minutes } = req.body;
    
    if (!minutes || minutes <= 0) {
      return res.status(400).json({
        error: 'Invalid minutes',
        message: 'Minutes must be a positive number'
      });
    }
    
    const result = trackTranscription(req.user.userId, minutes);
    res.json(result);
  } catch (error) {
    console.error('Error tracking transcription:', error);
    res.status(500).json({
      error: 'Failed to track transcription',
      message: error.message
    });
  }
});

/**
 * Track API call (internal endpoint)
 */
router.post('/track/api', authenticate, (req, res) => {
  try {
    const { endpoint } = req.body;
    
    const result = trackAPICall(req.user.userId, endpoint);
    res.json(result);
  } catch (error) {
    console.error('Error tracking API call:', error);
    res.status(500).json({
      error: 'Failed to track API call',
      message: error.message
    });
  }
});

/**
 * Track storage usage (internal endpoint)
 */
router.post('/track/storage', authenticate, (req, res) => {
  try {
    const { bytes } = req.body;
    
    if (!bytes || bytes <= 0) {
      return res.status(400).json({
        error: 'Invalid bytes',
        message: 'Bytes must be a positive number'
      });
    }
    
    const result = trackStorage(req.user.userId, bytes);
    res.json(result);
  } catch (error) {
    console.error('Error tracking storage:', error);
    res.status(500).json({
      error: 'Failed to track storage',
      message: error.message
    });
  }
});

/**
 * Track AI request (internal endpoint)
 */
router.post('/track/ai', authenticate, (req, res) => {
  try {
    const { model } = req.body;
    
    if (!model) {
      return res.status(400).json({
        error: 'Model required',
        message: 'AI model name is required'
      });
    }
    
    const result = trackAIRequest(req.user.userId, model);
    res.json(result);
  } catch (error) {
    console.error('Error tracking AI request:', error);
    res.status(500).json({
      error: 'Failed to track AI request',
      message: error.message
    });
  }
});

/**
 * Track feature usage (internal endpoint)
 */
router.post('/track/feature', authenticate, (req, res) => {
  try {
    const { feature } = req.body;
    
    if (!feature) {
      return res.status(400).json({
        error: 'Feature required',
        message: 'Feature name is required'
      });
    }
    
    const result = trackFeature(req.user.userId, feature);
    res.json(result);
  } catch (error) {
    console.error('Error tracking feature:', error);
    res.status(500).json({
      error: 'Failed to track feature',
      message: error.message
    });
  }
});

module.exports = router;