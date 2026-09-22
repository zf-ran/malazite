import ElementBuilder from '../modules/element-builder.js';
import { RouteParams } from '../router.js';

import type { JSONDocument, Resource } from '../types/resource.types.js';

import type { User, UserResource } from '../types/user.types.js';
import type { Problem, ProblemResource } from '../types/problem.types.js';

const absoluteTimeFormatter = new Intl.DateTimeFormat('en-US', {
	dateStyle: 'long',
});

export async function Problems(root: HTMLElement, params: RouteParams) {
	new ElementBuilder('h1').text('Problems').appendTo(root);

	const problemCardContainer = new ElementBuilder('div')
		.classes(['problem-card-container'])
		.appendTo(root);

	const problems = await fetchProblems();

	for (const problem of problems)
		createProblemCard(problem, problemCardContainer);
}

function createProblemCard(
	problem: Problem,
	problemCardContainer: HTMLElement,
) {
	const problemCard = new ElementBuilder('div')
		.classes(['problem-card'])
		.appendTo(problemCardContainer);

	new ElementBuilder('a')
		.attributes({ href: `#/problems/${problem.id}`, 'data-link': '' })
		.classes(['link'])
		.appendTo(problemCard);

	const metadataElement = new ElementBuilder('div')
		.classes(['meta-data'])
		.appendTo(problemCard);

	new ElementBuilder('div')
		.text(problem.title)
		.classes(['title'])
		.appendTo(metadataElement);

	new ElementBuilder('author')
		.text(`@${problem.problemsetter.username}`)
		.classes(['author'])
		.appendTo(metadataElement);

	const detailsElement = new ElementBuilder('div')
		.classes(['details'])
		.appendTo(metadataElement);

	new ElementBuilder('div')
		.text(absoluteTimeFormatter.format(problem.createdAt))
		.classes(['date'])
		.appendTo(detailsElement);
}

async function fetchProblems(): Promise<Problem[]> {
	const headers = new Headers();
	headers.append('Accept', 'application/vnd.api+json');

	const query = new URLSearchParams();
	query.append('fields[problems]', 'title,createdAt,problemsetter');
	query.append('include', 'problemsetter');

	const response = await fetch(`/api/problems?${query.toString()}`, {
		method: 'GET',
		headers,
	});

	const json = (await response.json()) as JSONDocument<
		ProblemResource[],
		UserResource
	>;

	const data = json.data;
	const included = json.included || [];

	const problems: Problem[] = [];

	for (const resource of data) {
		const problemsetterResource = included?.find(
			u => u.id === resource.relationships.problemsetter.data.id,
		);

		const problemsetter: User = {
			id: problemsetterResource?.id || '0',
			username: problemsetterResource?.attributes.username || '[deleted]',
			createdAt: problemsetterResource?.attributes.createdAt || '2',
		};

		problems.push({
			id: resource.id,
			title: resource.attributes.title,
			createdAt: new Date(resource.attributes.createdAt),
			problemsetter,
		});
	}

	return problems;
}
