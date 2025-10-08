const { getUsageLimit, calculateOverageCharges } = require('./stripe-service');

/**
 * Usage Service - Track and manage user usage across all features
 */

// In-memory storage (replace with database in production)
const usageStore = new Map();

/**
 * Initialize usage tracking for a user
 */
function initializeUsage(userId, planId) {
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  
  usageStore.set(userId, {
    userId,
    planId,
    month: currentMonth,
    transcriptionMinutes: 0,
    apiCalls: 0,
    storageUsed: 0,
    aiRequests: {
      total: 0,
      byModel: {
        'gpt-4': 0,
        'claude': 0,
        'gemini': 0,
        'basic': 0
      }
    },
    features: {
      summaries: 0,
      sentiment: 0,
      topics: 0,
      translations: 0,
      contentGeneration: 0
    },
    lastUpdated: new Date().toISOString()
  });
  
  return usageStore.get(userId);
}

/**
 * Get user usage
 */
function getUsage(userId) {
  if (!usageStore.has(userId)) {
    return null;
  }
  
  const usage = usageStore.get(userId);
  const currentMonth = new Date().toISOString().slice(0, 7);
  
  // Reset usage if new month
  if (usage.month !== currentMonth) {
    return initializeUsage(userId, usage.planId);
  }
  
  return usage;
}

/**
 * Track transcription usage
 */
function trackTranscription(userId, minutes, metadata = {}) {
  let usage = getUsage(userId);
  
  if (!usage) {
    throw new Error('Usage not initialized for user');
  }
  
  usage.transcriptionMinutes += minutes;
  usage.lastUpdated = new Date().toISOString();
  
  // Check if over limit
  const limit = getUsageLimit(usage.planId, 'transcriptionMinutes');
  const isOverLimit = limit !== -1 && usage.transcriptionMinutes > limit;
  
  usageStore.set(userId, usage);
  
  return {
    success: true,
    usage: usage.transcriptionMinutes,
    limit,
    isOverLimit,
    remaining: limit === -1 ? -1 : Math.max(0, limit - usage.transcriptionMinutes),
    overageCharges: isOverLimit ? calculateOverageCharges(usage.planId, usage.transcriptionMinutes) : 0
  };
}

/**
 * Track API usage
 */
function trackAPICall(userId, endpoint, metadata = {}) {
  let usage = getUsage(userId);
  
  if (!usage) {
    throw new Error('Usage not initialized for user');
  }
  
  usage.apiCalls += 1;
  usage.lastUpdated = new Date().toISOString();
  
  usageStore.set(userId, usage);
  
  return {
    success: true,
    totalCalls: usage.apiCalls
  };
}

/**
 * Track storage usage
 */
function trackStorage(userId, bytesAdded) {
  let usage = getUsage(userId);
  
  if (!usage) {
    throw new Error('Usage not initialized for user');
  }
  
  usage.storageUsed += bytesAdded;
  usage.lastUpdated = new Date().toISOString();
  
  const limit = getUsageLimit(usage.planId, 'storage');
  const isOverLimit = limit !== -1 && usage.storageUsed > limit;
  
  usageStore.set(userId, usage);
  
  return {
    success: true,
    used: usage.storageUsed,
    limit,
    isOverLimit,
    remaining: limit === -1 ? -1 : Math.max(0, limit - usage.storageUsed),
    usedMB: (usage.storageUsed / (1024 * 1024)).toFixed(2),
    limitMB: limit === -1 ? 'Unlimited' : (limit / (1024 * 1024)).toFixed(2)
  };
}

/**
 * Track AI model usage
 */
function trackAIRequest(userId, model, metadata = {}) {
  let usage = getUsage(userId);
  
  if (!usage) {
    throw new Error('Usage not initialized for user');
  }
  
  usage.aiRequests.total += 1;
  
  if (usage.aiRequests.byModel[model] !== undefined) {
    usage.aiRequests.byModel[model] += 1;
  }
  
  usage.lastUpdated = new Date().toISOString();
  usageStore.set(userId, usage);
  
  return {
    success: true,
    totalRequests: usage.aiRequests.total,
    modelRequests: usage.aiRequests.byModel[model]
  };
}

/**
 * Track feature usage
 */
function trackFeature(userId, featureName, metadata = {}) {
  let usage = getUsage(userId);
  
  if (!usage) {
    throw new Error('Usage not initialized for user');
  }
  
  if (usage.features[featureName] !== undefined) {
    usage.features[featureName] += 1;
  }
  
  usage.lastUpdated = new Date().toISOString();
  usageStore.set(userId, usage);
  
  return {
    success: true,
    featureUsage: usage.features[featureName]
  };
}

/**
 * Check if user can perform action
 */
function canPerformAction(userId, actionType, requiredAmount = 0) {
  const usage = getUsage(userId);
  
  if (!usage) {
    return {
      allowed: false,
      reason: 'Usage not initialized'
    };
  }
  
  const limit = getUsageLimit(usage.planId, actionType);
  
  // Unlimited
  if (limit === -1) {
    return {
      allowed: true,
      unlimited: true
    };
  }
  
  let currentUsage = 0;
  
  switch (actionType) {
    case 'transcriptionMinutes':
      currentUsage = usage.transcriptionMinutes;
      break;
    case 'storage':
      currentUsage = usage.storageUsed;
      break;
    case 'apiAccess':
      return {
        allowed: limit === true,
        reason: limit ? null : 'API access not available in your plan'
      };
    default:
      return {
        allowed: false,
        reason: 'Unknown action type'
      };
  }
  
  const remaining = limit - currentUsage;
  const allowed = remaining >= requiredAmount;
  
  return {
    allowed,
    remaining,
    limit,
    current: currentUsage,
    reason: allowed ? null : `Insufficient ${actionType}. Upgrade your plan or wait for next billing cycle.`
  };
}

/**
 * Get usage statistics
 */
function getUsageStats(userId) {
  const usage = getUsage(userId);
  
  if (!usage) {
    return null;
  }
  
  const transcriptionLimit = getUsageLimit(usage.planId, 'transcriptionMinutes');
  const storageLimit = getUsageLimit(usage.planId, 'storage');
  
  return {
    month: usage.month,
    transcription: {
      used: usage.transcriptionMinutes,
      limit: transcriptionLimit,
      percentage: transcriptionLimit === -1 ? 0 : (usage.transcriptionMinutes / transcriptionLimit) * 100,
      remaining: transcriptionLimit === -1 ? -1 : Math.max(0, transcriptionLimit - usage.transcriptionMinutes),
      isOverLimit: transcriptionLimit !== -1 && usage.transcriptionMinutes > transcriptionLimit,
      overageCharges: calculateOverageCharges(usage.planId, usage.transcriptionMinutes)
    },
    storage: {
      used: usage.storageUsed,
      limit: storageLimit,
      percentage: storageLimit === -1 ? 0 : (usage.storageUsed / storageLimit) * 100,
      remaining: storageLimit === -1 ? -1 : Math.max(0, storageLimit - usage.storageUsed),
      usedMB: (usage.storageUsed / (1024 * 1024)).toFixed(2),
      limitMB: storageLimit === -1 ? 'Unlimited' : (storageLimit / (1024 * 1024)).toFixed(2)
    },
    api: {
      totalCalls: usage.apiCalls
    },
    ai: {
      totalRequests: usage.aiRequests.total,
      byModel: usage.aiRequests.byModel
    },
    features: usage.features,
    lastUpdated: usage.lastUpdated
  };
}

/**
 * Reset usage for new billing period
 */
function resetUsage(userId, planId) {
  return initializeUsage(userId, planId);
}

/**
 * Update user plan
 */
function updatePlan(userId, newPlanId) {
  const usage = getUsage(userId);
  
  if (!usage) {
    return initializeUsage(userId, newPlanId);
  }
  
  usage.planId = newPlanId;
  usage.lastUpdated = new Date().toISOString();
  
  usageStore.set(userId, usage);
  
  return usage;
}

/**
 * Get all users over limit
 */
function getUsersOverLimit() {
  const overLimitUsers = [];
  
  for (const [userId, usage] of usageStore.entries()) {
    const transcriptionLimit = getUsageLimit(usage.planId, 'transcriptionMinutes');
    const storageLimit = getUsageLimit(usage.planId, 'storage');
    
    const isOverTranscription = transcriptionLimit !== -1 && usage.transcriptionMinutes > transcriptionLimit;
    const isOverStorage = storageLimit !== -1 && usage.storageUsed > storageLimit;
    
    if (isOverTranscription || isOverStorage) {
      overLimitUsers.push({
        userId,
        transcription: {
          over: isOverTranscription,
          used: usage.transcriptionMinutes,
          limit: transcriptionLimit
        },
        storage: {
          over: isOverStorage,
          used: usage.storageUsed,
          limit: storageLimit
        }
      });
    }
  }
  
  return overLimitUsers;
}

/**
 * Export usage data for billing
 */
function exportUsageForBilling(userId, startDate, endDate) {
  const usage = getUsage(userId);
  
  if (!usage) {
    return null;
  }
  
  return {
    userId,
    planId: usage.planId,
    period: {
      start: startDate,
      end: endDate
    },
    transcriptionMinutes: usage.transcriptionMinutes,
    overageCharges: calculateOverageCharges(usage.planId, usage.transcriptionMinutes),
    apiCalls: usage.apiCalls,
    storageUsed: usage.storageUsed,
    aiRequests: usage.aiRequests,
    features: usage.features
  };
}

module.exports = {
  initializeUsage,
  getUsage,
  trackTranscription,
  trackAPICall,
  trackStorage,
  trackAIRequest,
  trackFeature,
  canPerformAction,
  getUsageStats,
  resetUsage,
  updatePlan,
  getUsersOverLimit,
  exportUsageForBilling
};