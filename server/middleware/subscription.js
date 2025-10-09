const { getPlanDetails, hasFeatureAccess, getUsageLimit } = require('../services/stripe-service');
const { canPerformAction, getUsage } = require('../services/usage-service');

/**
 * Check if user has active subscription
 */
function requireSubscription(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please log in to continue'
      });
    }
    
    // TODO: Get user's subscription from database
    // For now, assume user has subscription info attached
    if (!req.user.subscription || req.user.subscription.status !== 'active') {
      return res.status(403).json({
        error: 'Subscription required',
        message: 'Please subscribe to access this feature',
        upgradeUrl: '/pricing'
      });
    }
    
    next();
  } catch (error) {
    console.error('Subscription check error:', error);
    return res.status(500).json({
      error: 'Subscription check failed',
      message: 'Internal server error'
    });
  }
}

/**
 * Check if user has access to specific feature
 */
function requireFeature(featureName) {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'Please log in to continue'
        });
      }
      
      // TODO: Get user's plan from database
      const userPlan = req.user.planId || 'free';
      
      const hasAccess = hasFeatureAccess(userPlan, featureName);
      
      if (!hasAccess) {
        const planDetails = getPlanDetails(userPlan);
        return res.status(403).json({
          error: 'Feature not available',
          message: `This feature is not available in your ${planDetails.name} plan`,
          feature: featureName,
          currentPlan: userPlan,
          upgradeUrl: '/pricing'
        });
      }
      
      next();
    } catch (error) {
      console.error('Feature check error:', error);
      return res.status(500).json({
        error: 'Feature check failed',
        message: 'Internal server error'
      });
    }
  };
}

/**
 * Check if user has sufficient usage quota
 */
function checkUsageLimit(actionType, requiredAmount = 0) {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'Please log in to continue'
        });
      }
      
      const check = canPerformAction(req.user.userId, actionType, requiredAmount);
      
      if (!check.allowed) {
        const usage = getUsage(req.user.userId);
        const planDetails = getPlanDetails(usage?.planId || 'free');
        
        return res.status(429).json({
          error: 'Usage limit exceeded',
          message: check.reason,
          actionType,
          current: check.current,
          limit: check.limit,
          remaining: check.remaining,
          currentPlan: usage?.planId || 'free',
          upgradeUrl: '/pricing',
          suggestion: check.unlimited ? null : `Upgrade to ${planDetails.name} plan for more ${actionType}`
        });
      }
      
      // Attach usage info to request
      req.usageCheck = check;
      
      next();
    } catch (error) {
      console.error('Usage limit check error:', error);
      return res.status(500).json({
        error: 'Usage check failed',
        message: 'Internal server error'
      });
    }
  };
}

/**
 * Require specific plan tier
 */
function requirePlan(minPlanTier) {
  const planHierarchy = ['free', 'pro', 'business', 'enterprise'];
  
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'Please log in to continue'
        });
      }
      
      const userPlan = req.user.planId || 'free';
      const userTierIndex = planHierarchy.indexOf(userPlan);
      const requiredTierIndex = planHierarchy.indexOf(minPlanTier);
      
      if (userTierIndex < requiredTierIndex) {
        return res.status(403).json({
          error: 'Plan upgrade required',
          message: `This feature requires ${minPlanTier} plan or higher`,
          currentPlan: userPlan,
          requiredPlan: minPlanTier,
          upgradeUrl: '/pricing'
        });
      }
      
      next();
    } catch (error) {
      console.error('Plan check error:', error);
      return res.status(500).json({
        error: 'Plan check failed',
        message: 'Internal server error'
      });
    }
  };
}

/**
 * Rate limiting middleware
 */
function rateLimit(maxRequests, windowMs) {
  const requests = new Map();
  
  return (req, res, next) => {
    try {
      const userId = req.user?.userId || req.ip;
      const now = Date.now();
      
      if (!requests.has(userId)) {
        requests.set(userId, []);
      }
      
      const userRequests = requests.get(userId);
      
      // Remove old requests outside the window
      const validRequests = userRequests.filter(timestamp => now - timestamp < windowMs);
      
      if (validRequests.length >= maxRequests) {
        const oldestRequest = Math.min(...validRequests);
        const resetTime = oldestRequest + windowMs;
        const retryAfter = Math.ceil((resetTime - now) / 1000);
        
        return res.status(429).json({
          error: 'Too many requests',
          message: `Rate limit exceeded. Please try again in ${retryAfter} seconds`,
          retryAfter,
          limit: maxRequests,
          window: windowMs / 1000
        });
      }
      
      validRequests.push(now);
      requests.set(userId, validRequests);
      
      next();
    } catch (error) {
      console.error('Rate limit error:', error);
      next(); // Don't block on rate limit errors
    }
  };
}

module.exports = {
  requireSubscription,
  requireFeature,
  checkUsageLimit,
  requirePlan,
  rateLimit
};