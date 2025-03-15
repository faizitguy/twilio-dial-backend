const Joi = require('@hapi/joi');
const Boom = require('@hapi/boom');
const twilioService = require('../services/twilio');
const Call = require('../models/Call');

module.exports = {
    name: 'call-routes',
    register: async function (server) {
        server.route([
            {
                method: 'POST',
                path: '/initiateCall',
                options: {
                    auth: 'session',
                    validate: {
                        payload: Joi.object({
                            phoneNumber: Joi.string().required()
                        })
                    },
                    handler: async (request, h) => {
                        try {
                            const { phoneNumber } = request.payload;
                            const result = await twilioService.initiateCall(phoneNumber);
                            
                            if (!result.success) {
                                console.error('Call initiation failed:', result.error);
                                // Check for specific Twilio error codes and return appropriate errors
                                if (result.code === 21211) {
                                    throw Boom.badRequest('Invalid phone number format');
                                } else if (result.code === 21214) {
                                    throw Boom.badRequest('To phone number cannot be reached');
                                } else if (result.status === 401) {
                                    throw Boom.unauthorized('Invalid Twilio credentials');
                                }
                                throw Boom.badImplementation('Failed to initiate call: ' + result.error);
                            }

                            try {
                                // Save call record to database
                                const callRecord = new Call({
                                    userId: request.auth.credentials.id,
                                    phoneNumber: phoneNumber,
                                    callSid: result.call.sid,
                                    status: result.call.status
                                });
                                await callRecord.save();
                            } catch (dbError) {
                                console.error('Database error while saving call record:', dbError);
                                // Don't fail the request if database save fails
                                // The call is already initiated through Twilio
                            }

                            return {
                                message: 'Call initiated successfully',
                                callSid: result.call.sid,
                                status: result.call.status
                            };
                        } catch (error) {
                            console.error('Call initiation error:', error);
                            if (error.isBoom) {
                                throw error;
                            }
                            throw Boom.badImplementation('Failed to initiate call');
                        }
                    }
                }
            },
            {
                method: 'POST',
                path: '/endCall',
                options: {
                    auth: 'session',
                    validate: {
                        payload: Joi.object({
                            callSid: Joi.string()
                                .required()
                                .pattern(/^CA[a-f0-9]{32}$/)
                                .message('Invalid Call SID format. Call SID must start with "CA" followed by 32 hexadecimal characters')
                        })
                    },
                    handler: async (request, h) => {
                        try {
                            const { callSid } = request.payload;
                            const result = await twilioService.endCall(callSid);
                            
                            if (!result.success) {
                                console.error('Call ending failed:', result.error);
                                if (result.code === 20404) {
                                    throw Boom.notFound('Call not found or already completed');
                                }
                                throw Boom.badImplementation('Failed to end call: ' + result.error);
                            }

                            try {
                                // Update call record in database
                                const callRecord = await Call.findOne({ callSid });
                                if (callRecord) {
                                    callRecord.status = result.call.status;
                                    callRecord.endTime = new Date();
                                    if (result.call.duration) {
                                        callRecord.duration = result.call.duration;
                                    }
                                    await callRecord.save();
                                }
                            } catch (dbError) {
                                console.error('Database error while updating call record:', dbError);
                                // Don't fail the request if database update fails
                            }

                            return {
                                message: 'Call ended successfully',
                                status: result.call.status
                            };
                        } catch (error) {
                            console.error('Call ending error:', error);
                            if (error.isBoom) {
                                throw error;
                            }
                            throw Boom.badImplementation('Failed to end call');
                        }
                    }
                }
            },
            {
                method: 'GET',
                path: '/calls/history',
                options: {
                    auth: 'session',
                    validate: {
                        query: Joi.object({
                            page: Joi.number().integer().min(1).default(1),
                            limit: Joi.number().integer().min(1).max(100).default(10),
                            status: Joi.string().valid('queued', 'ringing', 'in-progress', 'completed', 'failed', 'busy', 'no-answer', 'canceled'),
                            startDate: Joi.date().iso(),
                            endDate: Joi.date().iso().min(Joi.ref('startDate'))
                        })
                    },
                    handler: async (request, h) => {
                        try {
                            const { page, limit, status, startDate, endDate } = request.query;
                            const query = { userId: request.auth.credentials.id };

                            // Add filters if provided
                            if (status) {
                                query.status = status;
                            }
                            if (startDate || endDate) {
                                query.startTime = {};
                                if (startDate) query.startTime.$gte = new Date(startDate);
                                if (endDate) query.startTime.$lte = new Date(endDate);
                            }

                            // Get total count for pagination
                            const total = await Call.countDocuments(query);

                            // Get paginated results
                            const calls = await Call.find(query)
                                .sort({ startTime: -1 })
                                .skip((page - 1) * limit)
                                .limit(limit);

                            return {
                                calls: calls.map(call => ({
                                    id: call._id,
                                    phoneNumber: call.phoneNumber,
                                    callSid: call.callSid,
                                    status: call.status,
                                    startTime: call.startTime,
                                    endTime: call.endTime,
                                    duration: call.duration
                                })),
                                pagination: {
                                    page,
                                    limit,
                                    total,
                                    pages: Math.ceil(total / limit)
                                }
                            };
                        } catch (error) {
                            console.error('Call history error:', error);
                            throw Boom.badImplementation('Failed to fetch call history');
                        }
                    }
                }
            }
        ]);
    }
};