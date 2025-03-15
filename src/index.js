require('dotenv').config();
const Hapi = require('@hapi/hapi');
const connectDB = require('./config/db');
const User = require('./models/User');
const authPlugin = require('./plugins/auth');
const authRoutes = require('./routes/auth');
const callRoutes = require('./routes/calls');
const contactRoutes = require('./routes/contacts');

const init = async () => {
    // Connect to MongoDB
    await connectDB();

    const server = Hapi.server({
        port: process.env.PORT || 3000,
        host: 'localhost',
        routes: {
            cors: {
                origin: ['*'],
                credentials: true
            }
        }
    });

    // Make the User model available throughout the application
    server.app.db = { User };

    // Register plugins
    await server.register([
        authPlugin,
        authRoutes,
        callRoutes,
        contactRoutes
    ]);

    try {
        await server.start();
        console.log('Server running on %s', server.info.uri);
    } catch (error) {
        console.error('Server start error:', error);
        process.exit(1);
    }

    process.on('unhandledRejection', (err) => {
        console.error('Unhandled rejection:', err);
        process.exit(1);
    });
};

init(); 