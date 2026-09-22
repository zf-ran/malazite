import ElementBuilder from '../modules/element-builder';

// TODO
export function Help(root: HTMLElement) {
	new ElementBuilder('h1').text('Help').appendTo(root);

	new ElementBuilder('p')
		.text('This page is still in progress, coming soon ….')
		.appendTo(root);
}
