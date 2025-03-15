const Joi = require('@hapi/joi');
const Boom = require('@hapi/boom');
const Contact = require('../models/Contact');

module.exports = {
    name: 'contact-routes',
    register: async function (server) {
        server.route([
            {
                method: 'POST',
                path: '/contacts',
                options: {
                    auth: 'session',
                    validate: {
                        payload: Joi.object({
                            name: Joi.string().required().trim().min(2),
                            phoneNumber: Joi.string().required().trim()
                                .pattern(/^\+?[1-9]\d{1,14}$/)
                                .message('Phone number must be in E.164 format (e.g., +1234567890)'),
                            email: Joi.string().email().allow('').trim(),
                            notes: Joi.string().allow('').trim()
                        })
                    },
                    handler: async (request, h) => {
                        try {
                            const { name, phoneNumber, email, notes } = request.payload;
                            
                            // Check if contact already exists for this user
                            const existingContact = await Contact.findOne({
                                userId: request.auth.credentials.id,
                                phoneNumber: phoneNumber
                            });

                            if (existingContact) {
                                throw Boom.conflict('Contact with this phone number already exists');
                            }

                            const contact = new Contact({
                                userId: request.auth.credentials.id,
                                name,
                                phoneNumber,
                                email,
                                notes
                            });

                            await contact.save();

                            return h.response({
                                message: 'Contact created successfully',
                                contact: {
                                    id: contact._id,
                                    name: contact.name,
                                    phoneNumber: contact.phoneNumber,
                                    email: contact.email,
                                    notes: contact.notes
                                }
                            }).code(201);
                        } catch (error) {
                            if (error.isBoom) {
                                throw error;
                            }
                            console.error('Contact creation error:', error);
                            throw Boom.badImplementation('Failed to create contact');
                        }
                    }
                }
            },
            {
                method: 'GET',
                path: '/contacts',
                options: {
                    auth: 'session',
                    validate: {
                        query: Joi.object({
                            page: Joi.number().integer().min(1).default(1),
                            limit: Joi.number().integer().min(1).max(100).default(10),
                            search: Joi.string().allow('').trim()
                        })
                    },
                    handler: async (request, h) => {
                        try {
                            const { page, limit, search } = request.query;
                            const query = { userId: request.auth.credentials.id };

                            // Add search functionality
                            if (search) {
                                query.$or = [
                                    { name: new RegExp(search, 'i') },
                                    { phoneNumber: new RegExp(search, 'i') },
                                    { email: new RegExp(search, 'i') }
                                ];
                            }

                            const total = await Contact.countDocuments(query);
                            const contacts = await Contact.find(query)
                                .sort({ name: 1 })
                                .skip((page - 1) * limit)
                                .limit(limit);

                            return {
                                contacts: contacts.map(contact => ({
                                    id: contact._id,
                                    name: contact.name,
                                    phoneNumber: contact.phoneNumber,
                                    email: contact.email,
                                    notes: contact.notes
                                })),
                                pagination: {
                                    page,
                                    limit,
                                    total,
                                    pages: Math.ceil(total / limit)
                                }
                            };
                        } catch (error) {
                            console.error('Contact fetch error:', error);
                            throw Boom.badImplementation('Failed to fetch contacts');
                        }
                    }
                }
            },
            {
                method: 'GET',
                path: '/contacts/{id}',
                options: {
                    auth: 'session',
                    validate: {
                        params: Joi.object({
                            id: Joi.string().required()
                        })
                    },
                    handler: async (request, h) => {
                        try {
                            const contact = await Contact.findOne({
                                _id: request.params.id,
                                userId: request.auth.credentials.id
                            });

                            if (!contact) {
                                throw Boom.notFound('Contact not found');
                            }

                            return {
                                id: contact._id,
                                name: contact.name,
                                phoneNumber: contact.phoneNumber,
                                email: contact.email,
                                notes: contact.notes
                            };
                        } catch (error) {
                            if (error.isBoom) {
                                throw error;
                            }
                            console.error('Contact fetch error:', error);
                            throw Boom.badImplementation('Failed to fetch contact');
                        }
                    }
                }
            },
            {
                method: 'PUT',
                path: '/contacts/{id}',
                options: {
                    auth: 'session',
                    validate: {
                        params: Joi.object({
                            id: Joi.string().required()
                        }),
                        payload: Joi.object({
                            name: Joi.string().required().trim().min(2),
                            phoneNumber: Joi.string().required().trim()
                                .pattern(/^\+?[1-9]\d{1,14}$/)
                                .message('Phone number must be in E.164 format (e.g., +1234567890)'),
                            email: Joi.string().email().allow('').trim(),
                            notes: Joi.string().allow('').trim()
                        })
                    },
                    handler: async (request, h) => {
                        try {
                            const { name, phoneNumber, email, notes } = request.payload;

                            // Check if the new phone number conflicts with another contact
                            const existingContact = await Contact.findOne({
                                userId: request.auth.credentials.id,
                                phoneNumber: phoneNumber,
                                _id: { $ne: request.params.id }
                            });

                            if (existingContact) {
                                throw Boom.conflict('Another contact with this phone number already exists');
                            }

                            const contact = await Contact.findOneAndUpdate(
                                {
                                    _id: request.params.id,
                                    userId: request.auth.credentials.id
                                },
                                {
                                    name,
                                    phoneNumber,
                                    email,
                                    notes
                                },
                                { new: true }
                            );

                            if (!contact) {
                                throw Boom.notFound('Contact not found');
                            }

                            return {
                                message: 'Contact updated successfully',
                                contact: {
                                    id: contact._id,
                                    name: contact.name,
                                    phoneNumber: contact.phoneNumber,
                                    email: contact.email,
                                    notes: contact.notes
                                }
                            };
                        } catch (error) {
                            if (error.isBoom) {
                                throw error;
                            }
                            console.error('Contact update error:', error);
                            throw Boom.badImplementation('Failed to update contact');
                        }
                    }
                }
            },
            {
                method: 'DELETE',
                path: '/contacts/{id}',
                options: {
                    auth: 'session',
                    validate: {
                        params: Joi.object({
                            id: Joi.string().required()
                        })
                    },
                    handler: async (request, h) => {
                        try {
                            const contact = await Contact.findOneAndDelete({
                                _id: request.params.id,
                                userId: request.auth.credentials.id
                            });

                            if (!contact) {
                                throw Boom.notFound('Contact not found');
                            }

                            return {
                                message: 'Contact deleted successfully'
                            };
                        } catch (error) {
                            if (error.isBoom) {
                                throw error;
                            }
                            console.error('Contact deletion error:', error);
                            throw Boom.badImplementation('Failed to delete contact');
                        }
                    }
                }
            }
        ]);
    }
}; 