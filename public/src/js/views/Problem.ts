import { EditorView } from 'codemirror';
import { tags } from '@lezer/highlight';

import { EditorState } from '@codemirror/state';

import {
	keymap,
	highlightSpecialChars,
	highlightActiveLine,
	highlightActiveLineGutter,
	drawSelection,
	rectangularSelection,
	dropCursor,
	lineNumbers,
} from '@codemirror/view';

import {
	HighlightStyle,
	indentUnit,
	syntaxHighlighting,
	indentOnInput,
	bracketMatching,
	foldGutter,
	foldKeymap,
} from '@codemirror/language';

import {
	defaultKeymap,
	history,
	historyKeymap,
	indentWithTab,
} from '@codemirror/commands';

import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';

import {
	autocompletion,
	completionKeymap,
	closeBrackets,
	closeBracketsKeymap,
} from '@codemirror/autocomplete';

import { python, pythonLanguage } from '@codemirror/lang-python';

import { RouteParams } from '../router.js';

import ElementBuilder from '../modules/element-builder.js';
import { parseAndPurify } from '../modules/marked.js';
import { loadStyle, loadScript, getUser } from '../modules/utils.js';

import dialog from '../components/dialog.js';
import toast from '../components/toast.js';
import { createTab } from '../components/tabs.js';

import type { User, UserResource } from '../types/user.types.js';
import type { Problem, ProblemResource } from '../types/problem.types.js';
import { JSONDocument, JSONError } from '../types/resource.types.js';
import { Submission, SubmissionResource } from '../types/submission.types.js';

declare global {
	interface Window {
		MathJax: {
			typesetPromise: (nodes?: HTMLElement[]) => Promise<void>;
		};
		isMathJaxReady: boolean;
		resolveMathJax: () => void;
		createEditor: (element: HTMLElement, initialValue: string) => EditorView;
		editorInstance: EditorView;
	}
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
	dateStyle: 'long',
});

const timeFormatter = new Intl.DateTimeFormat('en-US', {
	dateStyle: 'short',
	timeStyle: 'medium',
});

export async function Problem(root: HTMLElement, params: RouteParams) {
	const problemId = params.problemId;
	const problem = await fetchProblem(problemId);

	await loadStyle(
		'markdown-document',
		'/dist/css/modules/markdown-document.css',
	);

	await loadStyle('problem-style', '/dist/css/entries/problem.css');

	//* PROBLEM STATEMENT
	const leftPanelElement = new ElementBuilder('div')
		.classes(['left-panel'])
		.appendTo(root);

	const metadataElement = new ElementBuilder('div')
		.classes(['metadata'])
		.appendTo(leftPanelElement);

	new ElementBuilder('div')
		.classes(['title'])
		.text(problem.title)
		.appendTo(metadataElement);

	const statsElement = new ElementBuilder('div')
		.classes(['stats'])
		.appendTo(metadataElement);

	new ElementBuilder('span')
		.classes(['problemsetter'])
		.text(`@${problem.problemsetter.username}`)
		.appendTo(statsElement);

	new ElementBuilder('span')
		.classes(['created-at'])
		.text(dateFormatter.format(problem.createdAt))
		.appendTo(statsElement);

	const [statementTab, submissionsTab] = createTab(leftPanelElement, [
		{
			id: 'statement',
			label: 'Statement',
			selected: true,
		},
		{
			id: 'submissions',
			label: 'Submissions',
		},
	]);

	const markdownDocument = new ElementBuilder('div')
		.classes(['markdown-document'])
		.innerHTML(parseAndPurify(problem.statement || ''))
		.appendTo(statementTab.panel);

	submissionsTab.button.addEventListener('click', async () => {
		const user = await getUser();

		submissionsTab.panel.innerHTML = '';

		if (!user) {
			new ElementBuilder('p')
				.text('Log in to view your submissions.')
				.appendTo(submissionsTab.panel);
			return;
		}

		const submissions = await fetchSubmissions(problemId, user.id.toString());

		if (!submissions) return;

		if (submissions.length == 0) {
			new ElementBuilder('p')
				.text('No submissions.')
				.appendTo(submissionsTab.panel);
			return;
		}

		const submissionTable = new ElementBuilder('table').appendTo(
			submissionsTab.panel,
		);

		const submissionTableHeader = new ElementBuilder('thead').appendTo(
			submissionTable,
		);

		const submissionTableHeaderRow = new ElementBuilder('tr').appendTo(
			submissionTableHeader,
		);

		new ElementBuilder('th').text('#').appendTo(submissionTableHeaderRow);
		new ElementBuilder('th').text('Verdict').appendTo(submissionTableHeaderRow);
		new ElementBuilder('th').text('Time').appendTo(submissionTableHeaderRow);

		const submissionTableBody = new ElementBuilder('tbody').appendTo(
			submissionTable,
		);

		for (const submission of submissions) {
			const submissionTableBodyRow = new ElementBuilder('tr').appendTo(
				submissionTableBody,
			);

			new ElementBuilder('td')
				.classes(['tabular'])
				.text(submission.id)
				.appendTo(submissionTableBodyRow);
			new ElementBuilder('td')
				.classes(['center'])
				.innerHTML(
					`<span class="verdict" data-verdict="${submission.verdict.toLowerCase()}">${submission.verdict}</span>`,
				)
				.appendTo(submissionTableBodyRow);
			new ElementBuilder('td')
				.text(timeFormatter.format(submission.createdAt))
				.appendTo(submissionTableBodyRow);
		}
	});

	await loadScript('mathjax-config', '/vendor/js/mathjax-config.js');

	const mathjaxReady = new Promise<void>(resolve => {
		if (window.isMathJaxReady) resolve();
		else
			window.resolveMathJax = () => {
				resolve();
			};
	});

	await loadScript('MathJax-script', '/dist/mathjax/tex-chtml.js');
	await mathjaxReady;

	window.MathJax.typesetPromise([markdownDocument]);

	//* CODE EDITOR
	const rightPanelElement = new ElementBuilder('div')
		.classes(['right-panel'])
		.appendTo(root);

	const editorElement = new ElementBuilder('div')
		.id('editor')
		.appendTo(rightPanelElement);

	const submissionMenuElement = new ElementBuilder('div')
		.classes(['submission-menu'])
		.appendTo(rightPanelElement);

	const submissionFeedbackElement = new ElementBuilder('div')
		.classes(['submission-feedback'])
		.appendTo(submissionMenuElement);

	const submissionButtonGroup = new ElementBuilder('div')
		.classes(['button-group'])
		.attributes({ role: 'group ' })
		.appendTo(submissionMenuElement);

	const submitButton = new ElementBuilder('button').appendTo(
		submissionButtonGroup,
	) as HTMLButtonElement;

	submitButton.addEventListener('click', async () => {
		if (submitButton.disabled) return;

		const user = await getUser();

		if (!user) {
			await dialog.alert({
				title: 'Log in to submit',
				message: 'To submit your code, you need to log in first!',
				dismissIcon: 'thumb_up',
				dismissText: 'Alright',
			});
			return;
		}

		submitButton.disabled = true;
		submissionFeedbackElement.innerHTML = '';

		const submission = await submit(problemId, user.id.toString());

		submissionFeedbackElement.innerHTML += `<span class="verdict" data-verdict="${submission.verdict.toLowerCase()}">${submission.verdict}</span> `;
		submissionFeedbackElement.innerHTML += submission.error;

		submitButton.disabled = false;
	});

	new ElementBuilder('span')
		.classes(['material-symbols-outlined'])
		.text('send')
		.appendTo(submitButton);

	new ElementBuilder('span').text('Submit').appendTo(submitButton);

	const editorInstance = initializeEditor(editorElement);
}

function initializeEditor(editorElement: HTMLElement): EditorView {
	const customFoldGutter = foldGutter({
		markerDOM(open) {
			const element = document.createElement('span');

			element.textContent = open ? '▾' : '▸';
			element.classList.add('fold-marker');

			return element;
		},
	});

	const customEditorTheme = EditorView.theme({
		'&': {
			height: '100%',
			fontFamily: 'var(--font-family--monospace)',
			backgroundColor: 'transparent',
			color: 'var(--text-color)',
		},
		'.cm-content': {
			fontFamily: 'var(--font-family--monospace)',
			caretColor: 'var(--text-color)',
		},
		'.cm-gutters': {
			fontFamily: 'var(--font-family--monospace)',
			backgroundColor: 'var(--background)',
			color: 'var(--text-mute)',
			borderColor: 'var(--border-mute)',
		},

		// Cursor
		'.cm-cursor, .cm-dropCursor': {
			borderColor: 'var(--text-color)',
		},

		// Selection
		'&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground':
			{
				backgroundColor: 'var(--secondary)',
			},
		'.cm-selectionBackground': {
			backgroundColor: 'var(--secondary)',
		},
		'.cm-selectionMatch, .cm-searchMatch': {
			backgroundColor: 'hsl(from var(--success) h s l / 25%)',
		},

		// Line
		'.cm-activeLine, .cm-activeLineGutter': {
			backgroundColor: 'hsl(from var(--secondary) h s l / 25%)',
		},

		// Panels
		'.cm-tooltip': {
			backgroundColor: 'var(--background)',
			borderColor: 'var(--border-mute)',
		},
		'.cm-tooltip-autocomplete': {
			backgroundColor: 'var(--background)',
		},
		'.cm-tooltip .cm-completionMatchedText': {
			textDecoration: 'none',
			color: 'var(--primary)',
			fontWeight: 'bold',
		},
		'.cm-tooltip li[aria-selected]': {
			backgroundColor: 'var(--primary)',
			color: 'var(--background)',
		},
		'.cm-tooltip li[aria-selected] .cm-completionMatchedText': {
			color: 'var(--secondary)',
		},

		// Fold
		'.cm-foldPlaceholder': {
			backgroundColor: 'transparent',
			borderColor: 'var(--border-mute)',
		},
	});

	const editorColorScheme = HighlightStyle.define([
		// Keywords
		{ tag: tags.keyword, color: 'var(--editor--keyword)' },

		// Strings
		{ tag: tags.string, color: 'var(--editor--string)' },

		// Comments
		{ tag: tags.comment, color: 'var(--editor--comment)' },

		// Functions
		{ tag: tags.function(tags.variableName), color: 'var(--editor--function)' },

		// Variables
		{ tag: tags.propertyName, color: 'var(--editor--variable)' },

		// Types/Classes
		{ tag: [tags.typeName, tags.className], color: 'var(--editor--type)' },

		// Numbers
		{ tag: tags.number, color: 'var(--editor--number)' },

		// Operators
		{
			tag: [tags.operator, tags.punctuation],
			color: 'var(--editor--operator)',
		},
	]);

	window.createEditor = (element: HTMLElement, initialValue = '') => {
		element.innerHTML = '';

		const editor = new EditorView({
			doc: initialValue,
			extensions: [
				// Basic Setups
				lineNumbers(),
				highlightActiveLineGutter(),
				highlightSpecialChars(),
				highlightActiveLine(),
				highlightSelectionMatches(),
				history(),
				drawSelection(),
				rectangularSelection(),
				dropCursor(),
				EditorState.allowMultipleSelections.of(true),
				indentOnInput(),
				bracketMatching(),
				closeBrackets(),
				autocompletion(),

				// Customs,
				indentUnit.of('    '),
				keymap.of([
					...closeBracketsKeymap,
					...defaultKeymap,
					...searchKeymap,
					...historyKeymap,
					...foldKeymap,
					...completionKeymap,
					indentWithTab,
				]),
				customFoldGutter,
				customEditorTheme,

				python(),
				pythonLanguage.data.of({
					closeBrackets: {
						brackets: ['(', '[', '{', "'", '"'],
					},
				}),

				syntaxHighlighting(editorColorScheme),
			],
			parent: element,
		});

		window.editorInstance = editor;
		return editor;
	};

	return window.createEditor(editorElement, '# submit your code here');
}

async function fetchProblem(problemId: string): Promise<Problem> {
	const headers = new Headers();
	headers.append('Accept', 'application/vnd.api+json');

	const query = new URLSearchParams();
	query.append('include', 'problemsetter');
	query.append('fields[users]', 'username');

	const response = await fetch(
		`/api/problems/${problemId}?${query.toString()}`,
		{
			method: 'GET',
			headers,
		},
	);

	const json = (await response.json()) as JSONDocument<
		ProblemResource,
		UserResource
	>;

	const resource = json.data;
	const included = json.included || [];

	const problemsetterResource = included.find(
		i => i.id === resource.relationships.problemsetter.data.id,
	);

	const problemsetter: User = {
		id: problemsetterResource?.id || '0',
		username: problemsetterResource?.attributes.username || '[deleted]',
		createdAt:
			problemsetterResource?.attributes.createdAt || '1970-01-01 00:00:00',
	};

	const problem: Problem = {
		id: resource.id,
		title: resource.attributes.title,
		statement: resource.attributes.statement,
		createdAt: new Date(resource.attributes.createdAt),
		problemsetter,
	};

	return problem;
}

async function fetchSubmissions(
	problemId: string,
	submitterId: string,
): Promise<Submission[] | null> {
	const headers = new Headers();
	headers.append('Accept', 'application/vnd.api+json');

	const query = new URLSearchParams();
	query.append('fields[submissions]', 'verdict,createdAt');
	query.append('filter[problem]', problemId);
	query.append('filter[submitter]', submitterId);
	query.append('sort', '-createdAt');

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), 4_000);

	try {
		const response = await fetch(`/api/submissions?${query}`, {
			method: 'GET',
			headers,
			signal: controller.signal,
		});

		clearTimeout(timeoutId);

		const json = await response.json();
		const data = json.data as SubmissionResource[];
		const errors = json.errors as JSONError[];

		if (errors) {
			for (const error of errors) {
				switch (error.code) {
					case 'UNEXPECTED_EXCEPTION':
						toast({
							title: 'Unexpected server error',
							message: error.detail,
						});
						break;
				}
			}

			return null;
		}

		const submissions: Submission[] = [];

		for (const resource of data) {
			submissions.push({
				id: resource.id,
				verdict: resource.attributes.verdict,
				createdAt: new Date(resource.attributes.createdAt),
			});
		}

		return submissions;
	} catch (error) {
		clearTimeout(timeoutId);

		if (error instanceof DOMException && error.name === 'AbortError') {
			toast({
				title: 'Connection timeout',
				message:
					'The server is taking too long to respond. You might be offline.',
			});
			return null;
		}

		if (error instanceof SyntaxError) {
			toast({
				title: 'Error',
				message: 'Failed to parse resource',
			});
			return null;
		}

		if (!navigator.onLine) {
			toast({
				title: "You're offline",
				message: "Cannot fetch submissions, you're offline",
			});
			return null;
		} else {
			toast({
				title: 'Network error',
				message: 'Server might be offline',
			});
			return null;
		}
	}
}

async function submit(
	problemId: string,
	submitterId: string,
): Promise<Submission> {
	const headers = new Headers();
	headers.append('Accept', 'application/vnd.api+json');
	headers.append('Content-Type', 'application/vnd.api+json');

	const query = new URLSearchParams();
	query.append('fields[submissions]', 'verdict,error');

	const code = window.editorInstance.state.doc.toString();

	const body = {
		data: {
			type: 'submissions',
			attributes: {
				code,
			},
			relationships: {
				problem: {
					data: {
						type: 'problems',
						id: problemId,
					},
				},
				submitter: {
					data: {
						type: 'users',
						id: submitterId,
					},
				},
			},
		},
	};

	const response = await fetch(`/api/submissions?${query}`, {
		method: 'POST',
		headers,
		body: JSON.stringify(body),
	});

	const json = (await response.json()) as JSONDocument<SubmissionResource>;

	const data = json.data;

	const submission: Submission = {
		id: data.id,
		createdAt: new Date(),
		verdict: data.attributes.verdict,
		error: data.attributes.error,
	};

	return submission;
}
