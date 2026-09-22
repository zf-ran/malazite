import { FastifyInstance } from 'fastify';
import {
	JsonApiDocument,
	JsonApiError,
	ZodValidationError,
} from '@jsonapi-serde/server/common';
import { SQLiteError } from 'bun:sqlite';

import { db } from '../db/db.js';
import {
	createDrizzleColumns,
	createDrizzleSorter,
	createZodBodyErrorJsonDocument,
	createZodParamErrorJsonDocument,
	createZodQueryErrorJsonDocument,
	sendJsonDocument,
	serialize,
} from '../serializer/serializer.js';
import {
	BODY_SCHEMAS,
	PARAM_SCHEMAS,
	QUERY_FIELDS,
	QUERY_PARSERS,
} from '../types/models.js';
import { users } from '../db/schema.js';
import { hashPassword } from './sessions.js';

//* ROUTE /api/users

export async function userRoutes(fastify: FastifyInstance) {
	fastify.get<{ Querystring: Record<string, string> }>(
		'/users',
		async (request, reply) => {
			try {
				const query = QUERY_PARSERS.user(request.query);

				const users = await db.query.users.findMany({
					columns: {
						id: true,
						...createDrizzleColumns(query.fields.users, QUERY_FIELDS.user),
					},
					orderBy: (users, { asc, desc }) =>
						createDrizzleSorter(query, users, asc, desc),
				});

				const document = serialize('users', users, {
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

	fastify.post<{ Querystring: Record<string, string> }>(
		'/users',
		async (request, reply) => {
			const payload = BODY_SCHEMAS.user.safeParse(request.body);

			if (!payload.success) {
				const error = createZodBodyErrorJsonDocument(payload.error);
				sendJsonDocument(reply, error);
				return;
			}

			try {
				const query = QUERY_PARSERS.user(request.query);

				const username = payload.data.data.attributes.username;
				const displayName = payload.data.data.attributes.displayName;
				const password = payload.data.data.attributes.password;

				const { passwordHash, salt } = hashPassword(password);

				const [account] = await db
					.insert(users)
					.values({
						username,
						passwordHash,
						displayName,
						salt,
					})
					.returning({ id: users.id });

				const user = await db.query.users.findFirst({
					columns: {
						id: true,
						...createDrizzleColumns(query.fields.users, QUERY_FIELDS.user),
					},
					where: (users, { eq }) => eq(users.id, account.id),
				});

				if (!user) {
					const error = new JsonApiError({
						status: '500',
						code: 'UNEXPECTED_EXCEPTION',
						title: 'Unexpected Exception',
						detail: 'User not found after creating',
					}).toDocument();

					sendJsonDocument(reply, error);
					return;
				}

				const document = serialize('users', user, {
					include: query.include,
					fields: query.fields,
				});

				sendJsonDocument(reply, document, 201);
			} catch (issue) {
				if (issue instanceof ZodValidationError) {
					const error = createZodQueryErrorJsonDocument(issue);
					sendJsonDocument(reply, error);
				} else if (
					issue instanceof SQLiteError
					&& issue.code === 'SQLITE_CONSTRAINT_UNIQUE'
				) {
					const error = new JsonApiError({
						status: '409',
						code: 'USER_ALREADY_REGISTERED',
						title: 'User Already Registered',
						detail: `User with username '${payload.data.data.attributes.username}' is already registered`,
					}).toDocument();

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

	fastify.get<{ Querystring: Record<string, string> }>(
		'/users/:userId',
		async (request, reply) => {
			const params = PARAM_SCHEMAS.user.safeParse(request.params);

			if (!params.success) {
				const error = createZodParamErrorJsonDocument(params.error);
				sendJsonDocument(reply, error);
				return;
			}

			try {
				const userId = params.data.userId;
				const query = QUERY_PARSERS.user(request.query);

				const user = await db.query.users.findFirst({
					columns: {
						id: true,
						...createDrizzleColumns(query.fields.users, QUERY_FIELDS.user),
					},
					where: (users, { eq }) => eq(users.id, userId),
				});

				if (!user) {
					const error = new JsonApiError({
						status: '404',
						code: 'NOT_FOUND',
						title: 'User Not Found',
						detail: `User with ID '${userId}' not found`,
					}).toDocument();

					sendJsonDocument(reply, error);
					return;
				}

				const document = serialize('users', user, {
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
