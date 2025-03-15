const Joi = require('@hapi/joi');
const Boom = require('@hapi/boom');
const bcrypt = require('bcrypt');

module.exports = {
    name: 'auth-routes',
    register: async function (server) {
        server.route([
            {
                method: 'POST',
                path: '/register',
                options: {
                    auth: false,
                    validate: {
                        payload: Joi.object({
                            username: Joi.string().required().min(3),
                            email: Joi.string().email().required(),
                            password: Joi.string().required().min(6),
                            phoneNumber: Joi.string().required()
                        })
                    },
                    handler: async (request, h) => {
                        try {
                            const { username, email, password, phoneNumber } = request.payload;
                            
                            // Check if user already exists
                            const existingUser = await request.server.app.db.User.findOne({
                                $or: [{ email }, { username }]
                            });

                            if (existingUser) {
                                throw Boom.conflict('User already exists');
                            }

                            const user = new request.server.app.db.User({
                                username,
                                email,
                                password,
                                phoneNumber
                            });

                            await user.save();

                            return h.response({ message: 'User registered successfully' }).code(201);
                        } catch (error) {
                            if (error.isBoom) throw error;
                            throw Boom.badImplementation(error);
                        }
                    }
                }
            },
            {
                method: 'POST',
                path: '/login',
                options: {
                    auth: false,
                    validate: {
                        payload: Joi.object({
                            username: Joi.string().required(),
                            password: Joi.string().required()
                        })
                    },
                    handler: async (request, h) => {
                        try {
                            const { username, password } = request.payload;

                            const user = await request.server.app.db.User.findOne({ username });
                            if (!user) {
                                throw Boom.unauthorized('Invalid credentials');
                            }

                            const isValid = await user.validatePassword(password);
                            if (!isValid) {
                                throw Boom.unauthorized('Invalid credentials');
                            }

                            request.cookieAuth.set({ id: user._id });

                            return { message: 'Logged in successfully' };
                        } catch (error) {
                            if (error.isBoom) throw error;
                            throw Boom.badImplementation(error);
                        }
                    }
                }
            },
            {
                method: 'POST',
                path: '/logout',
                options: {
                    auth: 'session',
                    handler: (request, h) => {
                        request.cookieAuth.clear();
                        return { message: 'Logged out successfully' };
                    }
                }
            },
            {
                method: 'GET',
                path: '/check-auth',
                options: {
                    auth: {
                        mode: 'try',
                        strategy: 'session'
                    },
                    handler: async (request, h) => {
                        if (!request.auth.isAuthenticated) {
                            return {
                                isAuthenticated: false
                            };
                        }

                        return {
                            isAuthenticated: true,
                            user: {
                                id: request.auth.credentials.id,
                                username: request.auth.credentials.username,
                                email: request.auth.credentials.email,
                                phoneNumber: request.auth.credentials.phoneNumber
                            }
                        };
                    }
                }
            }
        ]);
    }
}; 