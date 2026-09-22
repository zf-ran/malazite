import { FastifyInstance } from 'fastify';
import { JsonApiError, ZodValidationError } from '@jsonapi-serde/server/common';

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
import { JudgeResult, runJudge } from '../judge.js';
import { submissions } from '../db/schema.js';

//* ROUTE /api/submissions

export async function submissionRoutes(fastify: FastifyInstance) {
	fastify.get<{ Querystring: Record<string, string> }>(
		'/submissions',
		async (request, reply) => {
			try {
				const query = QUERY_PARSERS.submission(request.query);

				const problemId = query.filter?.problem;
				const submitterId = query.filter?.submitter;

				const submissions = await db.query.submissions.findMany({
					columns: {
						id: true,
						problemId: true,
						submitterId: true,
						...createDrizzleColumns(
							query.fields.submissions,
							QUERY_FIELDS.submission,
						),
					},
					with: {
						problem: {
							columns: {
								id: true,
								problemsetterId: true,
								...createDrizzleColumns(
									query.fields.problems,
									QUERY_FIELDS.problem,
								),
							},
						},
						submitter: {
							columns: {
								id: true,
								...createDrizzleColumns(query.fields.users, QUERY_FIELDS.user),
							},
						},
					},
					orderBy: (submissions, { asc, desc }) =>
						createDrizzleSorter(query, submissions, asc, desc),
					where: (submission, { eq, and }) =>
						and(
							problemId === undefined
								? undefined
								: eq(submission.problemId, problemId),
							submitterId === undefined
								? undefined
								: eq(submission.submitterId, submitterId),
						),
				});

				const document = serialize('submissions', submissions, {
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

	fastify.post<{ Querystring: Record<string, string> }>(
		'/submissions',
		{ preHandler: fastify.authenticate },
		async (request, reply) => {
			const payload = BODY_SCHEMAS.submission.safeParse(request.body);

			if (!payload.success) {
				const error = createZodBodyErrorJsonDocument(payload.error);
				sendJsonDocument(reply, error);
				return;
			}

			const code = payload.data.data.attributes.code;
			const problemId = payload.data.data.relationships.problem.data.id;
			const submitterId = payload.data.data.relationships.submitter.data.id;

			if (request.session?.user?.id != submitterId) {
				const error = new JsonApiError({
					status: '403',
					code: 'FORBIDDEN',
					title: 'Forbidden',
					detail: 'Cannot submit for other user',
				}).toDocument();

				sendJsonDocument(reply, error);
				return;
			}

			try {
				const query = QUERY_PARSERS.submission(request.query);

				const judgeResult: JudgeResult = await runJudge(code, problemId);

				const [createdSubmission] = await db
					.insert(submissions)
					.values({
						code,
						problemId,
						submitterId,
						error: judgeResult.error,
						verdict: judgeResult.verdict,
					})
					.returning({ id: submissions.id });

				const submission = await db.query.submissions.findFirst({
					columns: {
						id: true,
						problemId: true,
						submitterId: true,
						...createDrizzleColumns(
							query.fields.submissions,
							QUERY_FIELDS.submission,
						),
					},
					with: {
						problem: {
							columns: {
								id: true,
								problemsetterId: true,
								...createDrizzleColumns(
									query.fields.problems,
									QUERY_FIELDS.problem,
								),
							},
						},
						submitter: {
							columns: {
								id: true,
								...createDrizzleColumns(query.fields.users, QUERY_FIELDS.user),
							},
						},
					},
					where: (submissions, { eq }) =>
						eq(submissions.id, createdSubmission.id),
				});

				if (!submission) {
					const error = new JsonApiError({
						status: '500',
						code: 'UNEXPECTED_EXCEPTION',
						title: 'Unexpected Exception',
						detail: 'Submission not found after creating',
					}).toDocument();

					sendJsonDocument(reply, error);
					return;
				}

				const document = serialize('submissions', submission, {
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

	fastify.get<{ Querystring: Record<string, string> }>(
		'/submissions/:submissionId',
		async (request, reply) => {
			const params = PARAM_SCHEMAS.submission.safeParse(request.params);

			if (!params.success) {
				const error = createZodParamErrorJsonDocument(params.error);
				sendJsonDocument(reply, error);
				return;
			}

			try {
				const submissionId = params.data.submissionId;
				const query = QUERY_PARSERS.submission(request.query);

				const submission = await db.query.submissions.findFirst({
					columns: {
						id: true,
						problemId: true,
						submitterId: true,
						...createDrizzleColumns(
							query.fields.submissions,
							QUERY_FIELDS.submission,
						),
					},
					with: {
						problem: {
							columns: {
								id: true,
								problemsetterId: true,
								...createDrizzleColumns(
									query.fields.problems,
									QUERY_FIELDS.problem,
								),
							},
						},
						submitter: {
							columns: {
								id: true,
								...createDrizzleColumns(query.fields.users, QUERY_FIELDS.user),
							},
						},
					},
					where: (submissions, { eq }) => eq(submissions.id, submissionId),
				});

				if (!submission) {
					const error = new JsonApiError({
						status: '404',
						code: 'NOT_FOUND',
						title: 'Submission Not Found',
						detail: `Submission with ID '${submissionId}' not found`,
					}).toDocument();

					sendJsonDocument(reply, error);
					return;
				}

				const document = serialize('submissions', submission, {
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
