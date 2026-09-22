import {
	SerializeBuilder,
	type EntitySerializer,
} from '@jsonapi-serde/server/response';

import type { User, Problem, Submission, Session } from '../types/models.js';
import { FastifyReply } from 'fastify';
import {
	JsonApiDocument,
	JsonApiError,
	ZodValidationError,
} from '@jsonapi-serde/server/common';
import type { AnyColumn, SQL, SQLWrapper } from 'drizzle-orm';
import { ZodError } from 'zod';

//* SERIALIZERS
const userSerializer: EntitySerializer<User> = {
	getId: user => user.id.toString(),
	serialize: user => ({
		attributes: {
			username: user.username,
			displayName: user.displayName,
			createdAt: user.createdAt,
		},
	}),
};

const problemSerializer: EntitySerializer<Problem> = {
	getId: problem => problem.id.toString(),
	serialize: problem => ({
		attributes: {
			title: problem.title,
			statement: problem.statement,
			createdAt: problem.createdAt,
		},
		relationships: {
			problemsetter: {
				data: {
					type: 'users',
					id: problem.problemsetterId.toString(),
					entity: problem.problemsetter,
				},
			},
		},
	}),
};

const submissionSerializer: EntitySerializer<Submission> = {
	getId: submission => submission.id.toString(),
	serialize: submission => ({
		attributes: {
			code: submission.code,
			verdict: submission.verdict,
			error: submission.error,
			createdAt: submission.createdAt,
		},
		relationships: {
			problem: {
				data: {
					type: 'problems',
					id: submission.problemId.toString(),
					entity: submission.problem,
				},
			},
			submitter: {
				data: {
					type: 'users',
					id: submission.submitterId.toString(),
					entity: submission.submitter,
				},
			},
		},
	}),
};

const sessionSerializer: EntitySerializer<Session> = {
	getId: session => session.id.toString(),
	serialize: session => ({
		attributes: {
			token: session.token,
			createdAt: session.createdAt,
		},
		relationships: {
			user: {
				data: {
					type: 'users',
					id: session.userId.toString(),
					entity: session.user,
				},
			},
		},
	}),
};

export const serialize = SerializeBuilder.new()
	.add('users', userSerializer)
	.add('problems', problemSerializer)
	.add('submissions', submissionSerializer)
	.add('sessions', sessionSerializer)
	.build();

//* UTILS
// TODO: Move to a different file, perhaps utils.ts
export function sendJsonDocument(
	reply: FastifyReply,
	document: JsonApiDocument,
): void;

export function sendJsonDocument(
	reply: FastifyReply,
	document: JsonApiDocument,
	statusCode: number,
): void;

export function sendJsonDocument(
	reply: FastifyReply,
	document: JsonApiDocument,
	statusCode?: number,
) {
	if (!statusCode) statusCode = document.getStatus();

	reply
		.code(document.getStatus())
		.type(document.getContentType())
		.send(document.getBody());
}

export function createZodParamErrorJsonDocument(error: ZodError) {
	return new JsonApiError(
		error.issues.map(issue => ({
			status: '400',
			code: 'INVALID_PARAMETER',
			title: 'Invalid Parameter',
			detail: issue.message,
			source: {
				parameter: issue.path.join('.'),
			},
		})),
	).toDocument();
}

export function createZodQueryErrorJsonDocument(issue: ZodValidationError) {
	return new JsonApiError(
		issue.errors.map(i => ({
			status: '400',
			code: 'INVALID_QUERY',
			title: 'Invalid Query',
			detail: i.title,
			source: i.source,
		})),
	).toDocument();
}

export function createZodBodyErrorJsonDocument(error: ZodError) {
	return new JsonApiError(
		error.issues.map(issue => ({
			status: '400',
			code: 'INVALID_BODY',
			title: 'Invalid Body',
			detail: issue.message,
			source: {
				pointer: '/' + issue.path.join('/'),
			},
		})),
	).toDocument();
}

type DrizzleSorter = (column: SQLWrapper | AnyColumn) => SQL;

type SortQuery<TField extends PropertyKey> = {
	sort: ReadonlyArray<{
		order: 'asc' | 'desc';
		field: TField;
	}>;
};

export function createDrizzleColumns(
	chosenFields: string[] | undefined,
	allowedFields: readonly string[],
): Record<string, boolean> {
	const columns = Object.fromEntries(
		allowedFields.map(allowedField => [
			allowedField,
			chosenFields?.includes(allowedField) ?? true,
		]),
	);

	return columns;
}

export function createDrizzleSorter<
	TColumns extends Record<string, AnyColumn>,
	TField extends keyof TColumns,
>(
	query: SortQuery<TField>,
	column: TColumns,
	asc: DrizzleSorter,
	desc: DrizzleSorter,
): SQL[] {
	const orders: SQL[] = [];

	for (const { order, field } of query.sort) {
		if (order === 'asc') orders.push(asc(column[field]));
		else orders.push(desc(column[field]));
	}

	return orders;
}
