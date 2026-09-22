import ElementBuilder from '../modules/element-builder';

export function Home(root: HTMLElement) {
	new ElementBuilder('h1')
		.innerHTML('Welcome to M<sup>Z</sup>!')
		.appendTo(root);

	new ElementBuilder('p')
		.text(
			'Malazite is a Python programming jury system. Specifically made for beginners in Python.',
		)
		.appendTo(root);
}
