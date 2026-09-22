import {
	Parser,
	marked,
	type RendererObject,
	type TokenizerExtension,
} from 'marked';

import DOMPurify from 'isomorphic-dompurify';

const markedMath: TokenizerExtension = {
	name: 'math',
	level: 'inline',
	start(src: string) {
		return src.match(/\$/)?.index;
	},
	tokenizer(src, _tokens) {
		// Match block math: $$math$$
		const blockRule = /^\$\$\n?([\s\S]+?)\n?\$\$/;
		const blockMatch = blockRule.exec(src);

		if (blockMatch) {
			return {
				type: 'text',
				raw: blockMatch[0],
				text: blockMatch[0],
			};
		}

		// Match inline math: $math$
		const inlineRule = /^\$([^\$\n]+?)\$/;
		const inlineMatch = inlineRule.exec(src);

		if (inlineMatch) {
			return {
				type: 'text',
				raw: inlineMatch[0],
				text: inlineMatch[0],
			};
		}
	},
};

const markedRenderer: RendererObject = {
	heading({ text, depth, tokens }) {
		const headingIdRegex = /(?: +|^)\{#(\d|[a-z]|[\w-]*)\}(?: +|$)/i;
		const matches = text.match(headingIdRegex);

		for (const token of tokens) {
			if ('text' in token && typeof token.text === 'string')
				token.text = token.text.replace(headingIdRegex, '');
		}

		if (!matches)
			return `<h${depth} class="heading"><span class="heading-content" data-header="${depth}">${Parser.parseInline(tokens)}</span></h${depth}>`;

		const id = matches[1];

		return `<h${depth} class="heading has-link" id="section-${id}"><span class="heading-content" data-header="${depth}">${Parser.parseInline(tokens)}</span> <a href="#section-${id}" class="link"><span class="material-symbols-outlined">link</span></a></h${depth}>`;
	},
	code({ text, lang, raw }) {
		if (lang)
			return `<pre class="code-block"><code class="language-${lang}">${escapeHTML(text)}</code></pre>`;
		return `<pre class="code-block"><code>${text}</code></pre>`;
	},
	image({ href, title, text }) {
		if (title)
			return `<img loading="lazy" alt="${text}" title="${title}" src="${href}">`;
		return `<img loading="lazy" alt="${text}" src="${href}">`;
	},
	codespan({ text }) {
		return `<code class="code-span">${text}</code>`;
	},
	link({ href, title, text }) {
		if (title)
			return `<a class="anchor" title="${title}" href="${href}">${text}</a>`;
		return `<a class="anchor" href="${href}">${text}</a>`;
	},
};

marked.use({ renderer: markedRenderer, extensions: [markedMath] });

function escapeHTML(value: string): string {
	const div = document.createElement('div');
	div.textContent = value;
	return div.innerHTML;
}

export function parseAndPurify(source: string): string {
	return DOMPurify.sanitize(marked.parse(source, { async: false }));
}

export { marked };
