import ElementBuilder from '../modules/element-builder.js';
import { clearUser, getUser } from '../modules/utils.js';

export async function resolveUserMenu(topNavigation: HTMLElement) {
	const menuSection =
		document.getElementById('account-action')
		|| new ElementBuilder('li')
			.id('account-action')
			.classes(['action'])
			.appendTo(topNavigation);

	menuSection.innerHTML = '';

	clearUser();
	const user = await getUser();

	if (!user) {
		const loginRedirect = new ElementBuilder('a')
			.classes(['profile'])
			.attributes({
				href: '#/auth/login',
				'data-link': '',
			})
			.appendTo(menuSection);

		new ElementBuilder('button')
			.classes(['small', 'secondary'])
			.text('Log in')
			.appendTo(loginRedirect);

		const signupRedirect = new ElementBuilder('a')
			.classes(['profile'])
			.attributes({
				href: '#/auth/signup',
				'data-link': '',
			})
			.appendTo(menuSection);

		new ElementBuilder('button')
			.classes(['small'])
			.text('Sign up')
			.appendTo(signupRedirect);

		return;
	}

	const userRedirect = new ElementBuilder('a')
		.classes(['profile'])
		.appendTo(menuSection);

	const userButton = new ElementBuilder('button')
		.classes(['icon', 'large', 'secondary'])
		.appendTo(userRedirect);

	new ElementBuilder('span')
		.classes(['material-symbols-outlined'])
		.text('person')
		.appendTo(userButton);
}
