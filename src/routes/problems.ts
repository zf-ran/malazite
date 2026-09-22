import { FastifyInstance } from 'fastify';
import { JsonApiError, ZodValidationError } from '@jsonapi-serde/server/common';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { db } from '../db/db.js';
import {
	createDrizzleColumns,
	createDrizzleSorter,
	createZodParamErrorJsonDocument,
	createZodQueryErrorJsonDocument,
	sendJsonDocument,
	serialize,
} from '../serializer/serializer.js';
import { PARAM_SCHEMAS, QUERY_FIELDS, QUERY_PARSERS } from '../types/models.js';
import { config } from '../config.js';

//* ROUTE /api/problems

async function readProblemStatement(problemId: number) {
	const statementPath = path.join(
		config.root,
		'problems',
		String(problemId),
		'statement.md',
	);

	try {
		return await readFile(statementPath, 'utf8');
	} catch (error: unknown) {
		if (
			typeof error === 'object'
			&& error !== null
			&& 'code' in error
			&& error.code === 'ENOENT'
		) {
			return undefined;
		}

		throw error;
	}
}

async function loadProblemStatement<T extends { id: number }>(
	row: T,
): Promise<T & { statement?: string }> {
	return {
		...row,
		statement: await readProblemStatement(row.id),
	};
}

export async function problemRoutes(fastify: FastifyInstance) {
	fastify.get<{ Querystring: Record<string, string> }>(
		'/problems',
		async (request, reply) => {
			try {
				const query = QUERY_PARSERS.problem(request.query);
				const problemsetterId = query.filter?.problemsetter;

				const problems = await db.query.problems.findMany({
					columns: {
						id: true,
						problemsetterId: true,
						...createDrizzleColumns(
							query.fields.problems,
							QUERY_FIELDS.problem,
						),
					},
					with: {
						problemsetter: {
							columns: {
								id: true,
								...createDrizzleColumns(query.fields.users, QUERY_FIELDS.user),
							},
						},
					},
					orderBy: (problems, { asc, desc }) =>
						createDrizzleSorter(query, problems, asc, desc),
					where:
						problemsetterId === undefined
							? undefined
							: (problems, { eq }) =>
									eq(problems.problemsetterId, problemsetterId),
				});

				const includesStatement =
					query.fields.problems?.includes('statement') ?? true;

				const rows = includesStatement
					? await Promise.all(problems.map(loadProblemStatement))
					: problems;

				const document = serialize('problems', rows, {
					include: query.include,
					fields: query.fields,
				});

				sendJsonDocument(reply, document);
			} catch (issue) {
				if (issue instanceof ZodValidationError) {
					const error = createZodQueryErrorJsonDocument(issue);
					sendJsonDocument(reply, error);
				} else {
					console.error(issue);
				}
			}
		},
	);

	fastify.get<{ Querystring: Record<string, string> }>(
		'/problems/:problemId',
		async (request, reply) => {
			const params = PARAM_SCHEMAS.problem.safeParse(request.params);

			if (!params.success) {
				const error = createZodParamErrorJsonDocument(params.error);
				sendJsonDocument(reply, error);
				return;
			}

			try {
				const problemId = params.data.problemId;
				const query = QUERY_PARSERS.problem(request.query);

				const problem = await db.query.problems.findFirst({
					columns: {
						id: true,
						problemsetterId: true,
						...createDrizzleColumns(
							query.fields.problems,
							QUERY_FIELDS.problem,
						),
					},
					with: {
						problemsetter: {
							columns: {
								id: true,
								...createDrizzleColumns(query.fields.users, QUERY_FIELDS.user),
							},
						},
					},
					where: (problems, { eq }) => eq(problems.id, problemId),
				});

				if (!problem) {
					const error = new JsonApiError({
						status: '404',
						code: 'NOT_FOUND',
						title: 'Problem Not Found',
						detail: `Problem with ID '${problemId}' not found`,
					}).toDocument();

					sendJsonDocument(reply, error);
					return;
				}

				const includesStatement =
					query.fields.problems?.includes('statement') ?? true;

				const row = includesStatement
					? await loadProblemStatement(problem)
					: problem;

				const document = serialize('problems', row, {
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
