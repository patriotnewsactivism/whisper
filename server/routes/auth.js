const express = require('express');
const router = express.Router();
const { generateToken, authenticate } = require('../middleware/auth');
const {
  createUser,
  findUserByEmail,
  findUserById,
  verifyPassword,
  updateUser,
  updatePassword
} = require('../models/User');

/**
 * Sign up - Create new user account
 */
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Email and password are required'
      });
    }
    
    // Check if email is valid
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email',
        message: 'Please provide a valid email address'
      });
    }
    
    // Check password strength
    if (password.length < 8) {
      return res.status(400).json({
        error: 'Weak password',
        message: 'Password must be at least 8 characters long'
      });
    }
    
    // Check if user already exists
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        error: 'User already exists',
        message: 'An account with this email already exists'
      });
    }
    
    // Create user
    const user = await createUser(email, password, name);
    
    // Generate JWT token
    const token = generateToken(user.id, user.email);
    
    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        planId: user.plan_id,
        createdAt: user.created_at
      },
      token
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      error: 'Signup failed',
      message: 'An error occurred while creating your account'
    });
  }
});

/**
 * Login - Authenticate user
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing credentials',
        message: 'Email and password are required'
      });
    }
    
    // Verify credentials
    const user = await verifyPassword(email, password);
    
    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }
    
    // Get full user details
    const userDetails = await findUserById(user.id);
    
    // Generate JWT token
    const token = generateToken(user.id, user.email);
    
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: userDetails.id,
        email: userDetails.email,
        name: userDetails.name,
        planId: userDetails.plan_id,
        subscriptionStatus: userDetails.subscription_status,
        createdAt: userDetails.created_at
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: 'An error occurred while logging in'
    });
  }
});

/**
 * Get current user profile
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await findUserById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'Your account could not be found'
      });
    }
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        planId: user.plan_id,
        subscriptionId: user.subscription_id,
        subscriptionStatus: user.subscription_status,
        stripeCustomerId: user.stripe_customer_id,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Failed to get profile',
      message: 'An error occurred while fetching your profile'
    });
  }
});

/**
 * Update user profile
 */
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, email } = req.body;
    
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) {
      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          error: 'Invalid email',
          message: 'Please provide a valid email address'
        });
      }
      
      // Check if email is already taken
      const existingUser = await findUserByEmail(email);
      if (existingUser && existingUser.id !== req.user.userId) {
        return res.status(409).json({
          error: 'Email already taken',
          message: 'This email is already associated with another account'
        });
      }
      
      updates.email = email;
    }
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: 'No updates provided',
        message: 'Please provide fields to update'
      });
    }
    
    const updatedUser = await updateUser(req.user.userId, updates);
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        planId: updatedUser.plan_id,
        updatedAt: updatedUser.updated_at
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Failed to update profile',
      message: 'An error occurred while updating your profile'
    });
  }
});

/**
 * Change password
 */
router.put('/password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Current password and new password are required'
      });
    }
    
    // Check new password strength
    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'Weak password',
        message: 'New password must be at least 8 characters long'
      });
    }
    
    // Get user
    const user = await findUserById(req.user.userId);
    
    // Verify current password
    const isValid = await verifyPassword(user.email, currentPassword);
    if (!isValid) {
      return res.status(401).json({
        error: 'Invalid password',
        message: 'Current password is incorrect'
      });
    }
    
    // Update password
    await updatePassword(req.user.userId, newPassword);
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: 'Failed to change password',
      message: 'An error occurred while changing your password'
    });
  }
});

/**
 * Logout (client-side token removal)
 */
router.post('/logout', authenticate, (req, res) => {
  // With JWT, logout is handled client-side by removing the token
  // This endpoint is just for consistency
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

/**
 * Request password reset (placeholder)
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        error: 'Email required',
        message: 'Please provide your email address'
      });
    }
    
    // TODO: Implement password reset email
    // 1. Generate reset token
    // 2. Store token in database with expiry
    // 3. Send email with reset link
    
    // For now, always return success (don't reveal if email exists)
    res.json({
      success: true,
      message: 'If an account exists with this email, you will receive password reset instructions'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      error: 'Request failed',
      message: 'An error occurred while processing your request'
    });
  }
});

/**
 * Reset password (placeholder)
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Reset token and new password are required'
      });
    }
    
    // TODO: Implement password reset
    // 1. Verify reset token
    // 2. Check token expiry
    // 3. Update password
    // 4. Invalidate token
    
    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      error: 'Reset failed',
      message: 'An error occurred while resetting your password'
    });
  }
});

module.exports = router;