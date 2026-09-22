import { relations, sql } from 'drizzle-orm';
import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	username: text('username').unique().notNull(),
	displayName: text('display_name').notNull(),
	passwordHash: text('password_hash').notNull(),
	salt: text('salt').notNull(),
	createdAt: text('created_at')
		.default(sql`(CURRENT_TIMESTAMP)`)
		.notNull(),
});

export const sessions = sqliteTable('sessions', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	token: text('token').unique().notNull(),
	userId: integer('user_id')
		.references(() => users.id, { onDelete: 'cascade' })
		.notNull(),
	createdAt: text('created_at')
		.default(sql`(CURRENT_TIMESTAMP)`)
		.notNull(),
});

export const sessionRelations = relations(sessions, ({ one }) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id],
	}),
}));

export const problems = sqliteTable('problems', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	title: text('title').notNull(),
	problemsetterId: integer('problemsetter_id')
		.references(() => users.id, { onDelete: 'cascade' })
		.notNull(),
	createdAt: text('created_at')
		.default(sql`(CURRENT_TIMESTAMP)`)
		.notNull(),
});

export const problemRelations = relations(problems, ({ one }) => ({
	problemsetter: one(users, {
		fields: [problems.problemsetterId],
		references: [users.id],
	}),
}));

export const submissions = sqliteTable('submissions', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	submitterId: integer('submitter_id')
		.references(() => users.id, { onDelete: 'cascade' })
		.notNull(),
	problemId: integer('problem_id')
		.references(() => problems.id, { onDelete: 'cascade' })
		.notNull(),
	code: text('code').notNull(),
	verdict: text('verdict').notNull(),
	error: text('error').default(''),
	createdAt: text('created_at')
		.default(sql`(CURRENT_TIMESTAMP)`)
		.notNull(),
});

export const submissionRelations = relations(submissions, ({ one }) => ({
	submitter: one(users, {
		fields: [submissions.submitterId],
		references: [users.id],
	}),
	problem: one(problems, {
		fields: [submissions.problemId],
		references: [problems.id],
	}),
}));
