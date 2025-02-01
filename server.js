require('dotenv').config();
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdnjs.cloudflare.com"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://learn.reboot01.com"]
        }
    }
}));

// Compression middleware
app.use(compression());

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Middleware for parsing JSON bodies
app.use(express.json());

// Serve static files from the root directory
app.use(express.static(path.join(__dirname, 'public')));

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

// Middleware to log requests
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
        next();
    });
}

// Authentication endpoints
app.post('/api/login', async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }

        req.session.user = { token };
        res.json({ success: true });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ error: 'Failed to logout' });
        }
        res.json({ success: true });
    });
});

// Protected API endpoints
app.post('/api/graphql', requireAuth, async (req, res) => {
    try {
        const response = await fetch('https://learn.reboot01.com/api/graphql-engine/v1/graphql', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${req.session.user.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(req.body)
        });
        
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('GraphQL proxy error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Serve index.html only for the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '', 'index.html'));
});

// Serve 404 page for all other routes
app.get('*', (req, res) => {
    res.status(404).sendFile(path.join(__dirname, '', '404.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something broke!' });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});