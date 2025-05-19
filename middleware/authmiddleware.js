const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyToken = (req, res, next) => {
    // Check for token in the 'Authorization' header, format: Bearer <token>
    const token = req.headers['authorization']?.split(' ')[1] || req.cookies.token;

    // If no token is found, redirect to login page
    if (!token) {
        return res.status(401).json({ message: 'Authentication required. Please log in.' });
    }

    try {
        // Verify the token using the JWT secret stored in environment variables
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Attach the user information from the token payload to the request object
        req.user = decoded;

        // Proceed to the next middleware or route handler
        next();
    } catch (err) {
        // If the token is invalid or expired, send an error response
        console.error('Token verification failed:', err);
        return res.status(403).json({ message: 'Invalid or expired token. Please log in again.' });
    }
};

module.exports = verifyToken;
