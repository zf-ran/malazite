import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { JsonApiDocument, JsonApiError } from '@jsonapi-serde/server/common';

import { userRoutes } from './routes/users.js';
import { problemRoutes } from './routes/problems.js';
import { submissionRoutes } from './routes/submissions.js';
import { Session, User } from './types/models.js';
import { getToken, sessionRoutes } from './routes/sessions.js';
import { sendJsonDocument } from './serializer/serializer.js';
import { db } from './db/db.js';

function normalizeMediaType(value: string | undefined): string | undefined {
	return value?.split(';', 1)[0]?.trim().toLowerCase();
}

function acceptsJsonApi(value: string | undefined): boolean {
	if (!value) return true;

	return value
		.split(',')
		.map(part => normalizeMediaType(part))
		.some(
			mediaType =>
				mediaType === 'application/vnd.api+json'
				|| mediaType === '*/*'
				|| mediaType === 'application/*',
		);
}

declare module 'fastify' {
	interface FastifyInstance {
		authenticate: (
			request: FastifyRequest,
			reply: FastifyReply,
		) => Promise<void>;
	}
	interface FastifyRequest {
		session?: Session;
	}
}

export async function apiRoutes(fastify: FastifyInstance) {
	//* VALIDATES USER INPUT
	fastify.setErrorHandler((error, request, reply) => {
		if (request.headers['content-type'] === 'application/vnd.api+json') {
			sendJsonDocument(reply, error as JsonApiDocument);
			return;
		}

		reply.send(error);
	});

	fastify.addContentTypeParser(
		'application/vnd.api+json',
		{ parseAs: 'string' },
		(request: FastifyRequest, body: string, done) => {
			try {
				const json = JSON.parse(body);
				done(null, json);
			} catch (issue) {
				if (issue instanceof SyntaxError) {
					const error = new JsonApiError({
						status: '400',
						code: 'INVALID_JSON_DOCUMENT',
						title: 'Invalid JSON Document',
						detail: 'JSON body cannot be parsed',
					}).toDocument();

					done(error as any, undefined);
				} else {
					const error = new JsonApiError({
						status: '500',
						code: 'UNEXPECTED_EXCEPTION',
						title: 'Unexpected Exception',
						detail: String(issue),
					}).toDocument();

					done(error as any, undefined);
				}
			}
		},
	);

	fastify.addHook('onRequest', async (request, reply) => {
		if (['POST', 'PATCH', 'PUT'].includes(request.method)) {
			const contentType = normalizeMediaType(request.headers['content-type']);

			if (contentType !== 'application/vnd.api+json') {
				const error = new JsonApiError({
					status: '415',
					code: 'UNSUPPORTED_MEDIA',
					title: 'Unsupported Media',
					detail: "'Content-Type' must be 'application/vnd.api+json'",
				}).toDocument();

				sendJsonDocument(reply, error);
				return;
			}
		}

		const accept = request.headers['accept'];

		if (!acceptsJsonApi(accept)) {
			const error = new JsonApiError({
				status: '406',
				code: 'NOT_ACCEPTABLE',
				title: 'Not Acceptable',
				detail: "Client must accept 'application/vnd.api+json'",
			}).toDocument();

			sendJsonDocument(reply, error);
			return;
		}
	});

	// fastify.addHook('onSend', async (request, reply, payload) => {
	// 	reply.header('Content-Type', 'application/vnd.api+json');
	//
	// 	return payload;
	// });

	//* AUTH
	fastify.decorateRequest('session', undefined);
	fastify.decorate(
		'authenticate',
		async (request: FastifyRequest, reply: FastifyReply) => {
			const sessionToken = getToken(request);

			if (!sessionToken) {
				const error = new JsonApiError({
					status: '401',
					code: 'NOT_AUTHORIZED',
					title: 'Not Authorized',
					detail: 'User is not logged in, no session token given',
				}).toDocument();

				sendJsonDocument(reply, error);
				return;
			}

			const session = await db.query.sessions.findFirst({
				columns: {
					id: true,
					userId: true,
					createdAt: true,
				},
				with: {
					user: {
						columns: {
							username: true,
							displayName: true,
						},
					},
				},
				where: (sessions, { eq }) => eq(sessions.token, sessionToken),
			});

			if (!session) {
				const error = new JsonApiError({
					status: '401',
					code: 'INVALID_AUTHORIZATION',
					title: 'Invalid Authorization',
					detail: 'Session is invalid or expired',
				}).toDocument();

				sendJsonDocument(reply, error);
				return;
			}

			request.session = {
				id: session.id,
				token: sessionToken,
				createdAt: session.createdAt,
				userId: session.userId,
				user: {
					id: session.userId,
					username: session.user.username,
					displayName: session.user.displayName,
				},
			};
		},
	);

	//* ROUTES
	await fastify.register(userRoutes);
	await fastify.register(problemRoutes);
	await fastify.register(submissionRoutes);
	await fastify.register(sessionRoutes);
}
