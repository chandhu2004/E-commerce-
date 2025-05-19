const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db');
const verfiyToken = require('../middleware/authmiddleware');
require('dotenv').config();

const router = express.Router();

// Profile Route (Requires Authentication)
router.get('/profile', verfiyToken, async (req, res) => {
    try {
        const db = getDb();
        const user = await db.collection('users').findOne({ email: req.user.email });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json({ profile: user });
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// Registration Route
router.post('/register', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const db = getDb();

        // Check if user already exists
        const existingUser = await db.collection('users').findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = { email, password: hashedPassword };

        // Save user to the database
        await db.collection('users').insertOne(newUser);

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Registration failed' });
    }
});

// Login Route
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const db = getDb();
        const user = await db.collection('users').findOne({ email });
        if (!user) return res.status(400).json({ message: 'Invalid user or password' });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(400).json({ message: 'Invalid user or password' });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '9h' });

        res
            .cookie('token', token, { httpOnly: true })
            .status(200)
            .json({ message: 'Login Successfully', token });
    } catch (err) {
        console.error('Login error', err);
        res.status(500).json({ error: 'Login failed' });
    }
});


module.exports = router;
