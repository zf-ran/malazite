window.MathJax = {
	loader: {
		load: ['[tex]/ams', '[tex]/mathtools'],
		paths: {
			mathjax: '/dist/mathjax',
			fonts: '/dist/@mathjax',
		},
	},
	tex: {
		inlineMath: [['$', '$']],
		packages: {
			'[+]': ['ams', 'mathtools'],
		},
		tags: 'ams',
	},
	options: {
		ignoreHtmlClass: 'code-text',
		enableMenu: false,
	},
	startup: {
		typeset: false,
		pageReady: () => {
			return window.MathJax.startup.defaultPageReady().then(() => {
				if (window.resolveMathJax) window.resolveMathJax();
				window.isMathJaxReady = true;
			});
		},
	},
	output: {
		font: 'mathjax-fira',
	},
	chtml: { mtextInheritFont: true },
};
