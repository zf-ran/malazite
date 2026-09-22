import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { JsonApiError, ZodValidationError } from '@jsonapi-serde/server/common';
import * as o from 'drizzle-orm';
import crypto from 'node:crypto';

import { db } from '../db/db.js';
import {
	createDrizzleColumns,
	createZodBodyErrorJsonDocument,
	createZodQueryErrorJsonDocument,
	sendJsonDocument,
	serialize,
} from '../serializer/serializer.js';
import { BODY_SCHEMAS, QUERY_FIELDS, QUERY_PARSERS } from '../types/models.js';
import { sessions } from '../db/schema.js';

//* ROUTE /api/sessions

export async function sessionRoutes(fastify: FastifyInstance) {
	fastify.post<{ Querystring: Record<string, string> }>(
		'/sessions',
		async (request, reply) => {
			const payload = BODY_SCHEMAS.session.safeParse(request.body);

			if (!payload.success) {
				const error = createZodBodyErrorJsonDocument(payload.error);
				sendJsonDocument(reply, error);
				return;
			}

			try {
				const query = QUERY_PARSERS.session(request.query);

				const accountUsername = payload.data.data.attributes.username;
				const accountPassword = payload.data.data.attributes.password;

				const account = await db.query.users.findFirst({
					columns: {
						id: true,
						passwordHash: true,
						salt: true,
						...createDrizzleColumns(query.fields.users, QUERY_FIELDS.user),
					},
					where: (users, { eq }) => eq(users.username, accountUsername),
				});

				if (
					!account
					|| !validatePassword(
						accountPassword,
						account.passwordHash,
						account.salt,
					)
				) {
					const error = new JsonApiError({
						status: '401',
						code: 'NOT_AUTHORIZED',
						title: 'Not Authorized',
						detail: 'Invalid username or password',
					}).toDocument();

					sendJsonDocument(reply, error);
					return;
				}

				const sessionToken = crypto.randomBytes(32).toString('hex');

				const [newSession] = await db
					.insert(sessions)
					.values({
						token: sessionToken,
						userId: account.id,
					})
					.returning({ id: sessions.id });

				const session = await db.query.sessions.findFirst({
					columns: {
						id: true,
						userId: true,
						...createDrizzleColumns(
							query.fields.sessions,
							QUERY_FIELDS.session,
						),
					},
					with: {
						user: {
							columns: {
								id: true,
								...createDrizzleColumns(query.fields.users, QUERY_FIELDS.user),
							},
						},
					},
					where: (sessions, { eq }) => eq(sessions.id, newSession.id),
				});

				if (!session) {
					const error = new JsonApiError({
						status: '500',
						code: 'UNEXPECTED_EXCEPTION',
						title: 'Unexpected Exception',
						detail: 'Session not found after creating',
					}).toDocument();

					sendJsonDocument(reply, error);
					return;
				}

				const DAYS = 24 * 60 * 60;

				reply.setCookie('token', sessionToken, {
					path: '/',
					// secure: true,
					httpOnly: true,
					sameSite: 'lax',
					maxAge: 30 * DAYS,
				});

				const document = serialize('sessions', session, {
					include: query.include,
					fields: query.fields,
				});

				sendJsonDocument(reply, document, 201);
			} catch (issue) {
				if (issue instanceof ZodValidationError) {
					const error = createZodQueryErrorJsonDocument(issue);
					sendJsonDocument(reply, error);
				} else {
					const error = new JsonApiError({
						status: '500',
						code: 'UNEXPECTED_EXCEPTION',
						title: 'Unexpected Exception',
						detail: String(issue),
					}).toDocument();

					sendJsonDocument(reply, error);
				}
			}
		},
	);

	fastify.delete('/sessions/me', async (request, reply) => {
		const sessionToken = getToken(request);

		if (!sessionToken || !validateToken(sessionToken))
			return reply.status(204).send();

		reply.clearCookie('token', {
			path: '/',
			// secure: true,
			httpOnly: true,
			sameSite: 'lax',
		});

		await db.delete(sessions).where(o.eq(sessions.token, sessionToken));

		return reply.status(204).send();
	});

	fastify.get<{ Querystring: Record<string, string> }>(
		'/sessions/me',
		async (request, reply) => {
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

			try {
				const query = QUERY_PARSERS.session(request.query);

				const session = await db.query.sessions.findFirst({
					columns: {
						id: true,
						userId: true,
						...createDrizzleColumns(
							query.fields.sessions,
							QUERY_FIELDS.session,
						),
					},
					with: {
						user: {
							columns: {
								id: true,
								...createDrizzleColumns(query.fields.users, QUERY_FIELDS.user),
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

				const document = serialize('sessions', session, {
					include: query.include,
					fields: query.fields,
				});

				sendJsonDocument(reply, document);
			} catch (issue) {
				if (issue instanceof ZodValidationError) {
					const error = createZodQueryErrorJsonDocument(issue);
					sendJsonDocument(reply, error);
				} else {
					const error = new JsonApiError({
						status: '500',
						code: 'UNEXPECTED_EXCEPTION',
						title: 'Unexpected Exception',
						detail: String(issue),
					}).toDocument();

					sendJsonDocument(reply, error);
				}
			}
		},
	);
}

export function hashPassword(password: string): {
	passwordHash: string;
	salt: string;
} {
	const salt = crypto.randomBytes(16).toString('hex');
	const passwordHash = crypto
		.pbkdf2Sync(password, salt, 100_000, 32, 'sha256')
		.toString('hex');
	return { passwordHash, salt };
}

export function validatePassword(
	password: string,
	passwordHash: string,
	salt: string,
): boolean {
	const hash = crypto
		.pbkdf2Sync(password, salt, 100_000, 32, 'sha256')
		.toString('hex');
	return hash === passwordHash;
}

export async function validateToken(token: string): Promise<boolean> {
	const session = await db.query.sessions.findFirst({
		columns: { id: true },
		where: (sessions, { eq }) => eq(sessions.token, token),
	});

	if (!session) return false;
	return true;
}

export function getToken(request: FastifyRequest): string | undefined {
	return (
		request.cookies?.token
		|| request.headers['authorization']?.replace('Bearer ', '')
	);
}
