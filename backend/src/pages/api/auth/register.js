const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../../../models/user');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { name, email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists with this email' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      name: name || email.split('@')[0],
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await newUser.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: newUser._id, 
        email: newUser.email,
        role: newUser.role
      },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '7d' }
    );

    // Return user data and token
    res.status(201).json({
      token,
      user: {
        id: newUser._id,
        email: newUser.email,
        role: newUser.role,
        name: newUser.name
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};
