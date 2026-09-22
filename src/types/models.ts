import { createQueryParser } from '@jsonapi-serde/server/request';
import z from 'zod';

export interface User {
	id: number;
	username?: string;
	displayName?: string;
	createdAt?: string;
}

export interface Account extends User {
	passwordHash: string;
	salt: string;
}

export interface Problem {
	id: number;
	title?: string;
	statement?: string;
	createdAt?: string;

	// relations
	problemsetterId: number;
	problemsetter?: User;
}

export type SubmissionVerdict =
	| 'AC'
	| 'WA'
	| 'TLE'
	| 'MLE'
	| 'RTE'
	| 'CE'
	| 'SE';

export interface Submission {
	id: number;
	code?: string;
	verdict?: SubmissionVerdict;
	error?: string;
	createdAt?: string;

	// relations
	submitterId: number;
	submitter?: User;

	problemId: number;
	problem?: Problem;
}

export interface Session {
	id: number;
	token?: string;
	createdAt?: string;

	// relations
	userId: number;
	user?: User;
}

export const QUERY_FIELDS = {
	user: ['username', 'displayName', 'createdAt'] as const,
	problem: ['title', 'createdAt'] as const,
	submission: ['code', 'verdict', 'error', 'createdAt'] as const,
	session: ['token', 'user', 'createdAt'] as const,
} as const;

export const QUERY_PARSERS = {
	user: createQueryParser({
		sort: {
			allowed: QUERY_FIELDS.user,
			multiple: true,
		},
		fields: {
			allowed: {
				users: QUERY_FIELDS.user,
			},
		},
	}),
	problem: createQueryParser({
		include: {
			allowed: ['problemsetter'],
		},
		sort: {
			allowed: QUERY_FIELDS.problem,
			multiple: true,
		},
		fields: {
			allowed: {
				problems: [...QUERY_FIELDS.problem, 'statement', 'problemsetter'],
				users: QUERY_FIELDS.user,
			},
		},
		filter: z
			.object({
				problemsetter: z.coerce.number().int().optional(),
			})
			.optional(),
	}),
	submission: createQueryParser({
		include: {
			allowed: ['problem', 'submitter'],
		},
		sort: {
			allowed: QUERY_FIELDS.submission,
			multiple: true,
		},
		fields: {
			allowed: {
				submissions: QUERY_FIELDS.submission,
				problems: QUERY_FIELDS.problem,
				users: QUERY_FIELDS.user,
			},
		},
		filter: z
			.object({
				problem: z.coerce.number().int().optional(),
				submitter: z.coerce.number().int().optional(),
			})
			.optional(),
	}),
	session: createQueryParser({
		include: {
			allowed: ['user'],
		},
		fields: {
			allowed: {
				sessions: QUERY_FIELDS.session,
				users: QUERY_FIELDS.user,
			},
		},
	}),
};

export const BODY_SCHEMAS = {
	user: z.object({
		data: z.object({
			type: z.literal('users'),
			attributes: z.object({
				username: z
					.string()
					.trim()
					.min(3)
					.max(20)
					.regex(
						/^[a-zA-Z0-9_\.]+$/,
						'Username can only contain alphanumerics and underscores',
					),
				displayName: z.string().min(1).max(50),
				password: z.string(),
			}),
		}),
	}),
	submission: z.object({
		data: z.object({
			type: z.literal('submissions'),
			attributes: z.object({
				code: z.string().min(1).max(100_000),
			}),
			relationships: z.object({
				submitter: z.object({
					data: z.object({
						type: z.literal('users'),
						id: z.coerce.number().int(),
					}),
				}),
				problem: z.object({
					data: z.object({
						type: z.literal('problems'),
						id: z.coerce.number().int(),
					}),
				}),
			}),
		}),
	}),
	session: z.object({
		data: z.object({
			type: z.literal('sessions'),
			attributes: z.object({
				username: z.string(),
				password: z.string(),
			}),
		}),
	}),
};

export const PARAM_SCHEMAS = {
	user: createIdSchema('userId'),
	problem: createIdSchema('problemId'),
	submission: createIdSchema('submissionId'),
	session: createIdSchema('session'),
} as const;

function createIdSchema(name: string) {
	return z.object({
		[name]: z
			.string()
			.regex(/^\d+$/)
			.transform(id => parseInt(id)),
	});
}
