const bcrypt = require('bcryptjs');
const { query, transaction } = require('../db/connection');
const { createCustomer } = require('../services/stripe-service');
const { initializeUsage } = require('../services/usage-service');

/**
 * User Model
 */

/**
 * Create a new user
 */
async function createUser(email, password, name) {
  try {
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // Create Stripe customer
    const stripeCustomer = await createCustomer(email, name, { source: 'signup' });
    
    // Insert user into database
    const result = await query(
      `INSERT INTO users (email, password_hash, name, stripe_customer_id, plan_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, name, plan_id, stripe_customer_id, created_at`,
      [email, passwordHash, name, stripeCustomer.id, 'free']
    );
    
    const user = result.rows[0];
    
    // Initialize usage tracking
    initializeUsage(user.id, 'free');
    
    return user;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

/**
 * Find user by email
 */
async function findUserByEmail(email) {
  try {
    const result = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error finding user by email:', error);
    throw error;
  }
}

/**
 * Find user by ID
 */
async function findUserById(userId) {
  try {
    const result = await query(
      'SELECT id, email, name, stripe_customer_id, plan_id, subscription_id, subscription_status, created_at, updated_at FROM users WHERE id = $1',
      [userId]
    );
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error finding user by ID:', error);
    throw error;
  }
}

/**
 * Verify user password
 */
async function verifyPassword(email, password) {
  try {
    const result = await query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isValid) {
      return null;
    }
    
    // Return user without password hash
    return {
      id: user.id,
      email: user.email
    };
  } catch (error) {
    console.error('Error verifying password:', error);
    throw error;
  }
}

/**
 * Update user profile
 */
async function updateUser(userId, updates) {
  try {
    const allowedFields = ['name', 'email'];
    const fields = [];
    const values = [];
    let paramCount = 1;
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }
    
    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }
    
    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId);
    
    const result = await query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING id, email, name, plan_id, created_at, updated_at`,
      values
    );
    
    return result.rows[0];
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

/**
 * Update user password
 */
async function updatePassword(userId, newPassword) {
  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    
    await query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [passwordHash, userId]
    );
    
    return true;
  } catch (error) {
    console.error('Error updating password:', error);
    throw error;
  }
}

/**
 * Update user subscription
 */
async function updateSubscription(userId, subscriptionData) {
  try {
    const { subscriptionId, planId, status } = subscriptionData;
    
    const result = await query(
      `UPDATE users 
       SET subscription_id = $1, plan_id = $2, subscription_status = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, email, plan_id, subscription_id, subscription_status`,
      [subscriptionId, planId, status, userId]
    );
    
    return result.rows[0];
  } catch (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }
}

/**
 * Get user with subscription details
 */
async function getUserWithSubscription(userId) {
  try {
    const result = await query(
      `SELECT 
        id, email, name, stripe_customer_id, plan_id, 
        subscription_id, subscription_status, created_at, updated_at
       FROM users 
       WHERE id = $1`,
      [userId]
    );
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting user with subscription:', error);
    throw error;
  }
}

/**
 * Delete user (soft delete - mark as inactive)
 */
async function deleteUser(userId) {
  try {
    // In production, you might want to soft delete instead
    await query(
      'DELETE FROM users WHERE id = $1',
      [userId]
    );
    
    return true;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}

/**
 * Get all users (admin only)
 */
async function getAllUsers(limit = 100, offset = 0) {
  try {
    const result = await query(
      `SELECT id, email, name, plan_id, subscription_status, created_at 
       FROM users 
       ORDER BY created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    
    return result.rows;
  } catch (error) {
    console.error('Error getting all users:', error);
    throw error;
  }
}

/**
 * Get user count by plan
 */
async function getUserCountByPlan() {
  try {
    const result = await query(
      `SELECT plan_id, COUNT(*) as count 
       FROM users 
       GROUP BY plan_id`
    );
    
    return result.rows.reduce((acc, row) => {
      acc[row.plan_id] = parseInt(row.count);
      return acc;
    }, {});
  } catch (error) {
    console.error('Error getting user count by plan:', error);
    throw error;
  }
}

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  verifyPassword,
  updateUser,
  updatePassword,
  updateSubscription,
  getUserWithSubscription,
  deleteUser,
  getAllUsers,
  getUserCountByPlan
};