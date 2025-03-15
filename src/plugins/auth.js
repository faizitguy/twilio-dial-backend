const Boom = require('@hapi/boom');

const authPlugin = {
    name: 'auth',
    register: async function (server) {
        await server.register(require('@hapi/cookie'));

        server.auth.strategy('session', 'cookie', {
            cookie: {
                name: process.env.COOKIE_NAME,
                password: process.env.COOKIE_PASSWORD,
                isSecure: false, // Set to true in production with HTTPS
                ttl: 24 * 60 * 60 * 1000 // 24 hours
            },
            validate: async (request, session) => {
                try {
                    const user = await request.server.app.db.User.findById(session.id);
                    if (!user) {
                        return { isValid: false };
                    }
                    return {
                        isValid: true,
                        credentials: {
                            id: user._id,
                            username: user.username,
                            email: user.email,
                            phoneNumber: user.phoneNumber
                        }
                    };
                } catch (error) {
                    console.error('Session validation error:', error);
                    return { isValid: false };
                }
            }
        });

        server.auth.default('session');
    }
};

module.exports = authPlugin; 