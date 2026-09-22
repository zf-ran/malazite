import ElementBuilder from '../modules/element-builder.js';
import { RouteParams } from '../router.js';

import type { JSONDocument, Resource } from '../types/resource.types.js';
import type { Session, SessionResource } from '../types/session.types.js';

import toast from '../components/toast.js';
import { resolveUserMenu } from '../components/user-menu.js';

export function Auth(root: HTMLElement, params: RouteParams) {
	const authMode = params.mode == 'login' ? 'login' : 'signup';
	const modeTitle = sentenceCase(authMode);

	const modeSubtitle = {
		login:
			'Welcome back! Don\'t have an account yet? <a href="#/auth/signup" data-link>Signup</a> instead.',
		signup:
			'Register an account. Already have an account? <a href="#/auth/login">Login</a> instead.',
	}[authMode];

	const modeIcon = {
		login: 'login',
		signup: 'person_add',
	}[authMode];

	const formElement = new ElementBuilder('form')
		.id(`${authMode}-form`)
		.classes(['auth-form'])
		.attributes({
			action: `/auth/${authMode}`,
			method: 'POST',
			'aria-labelledby': 'form-title',
		})
		.appendTo(root) as HTMLFormElement;

	const formHeadingElement = new ElementBuilder('div')
		.classes(['form-heading'])
		.appendTo(formElement);

	new ElementBuilder('h1')
		.id('form-title')
		.classes(['form-title'])
		.text(modeTitle)
		.appendTo(formHeadingElement);

	new ElementBuilder('p')
		.classes(['form-subtitle'])
		.innerHTML(modeSubtitle)
		.appendTo(formHeadingElement);

	const formInputsContainer = new ElementBuilder('div')
		.classes(['form-inputs'])
		.appendTo(formElement);

	const usernameInput = createInputField(
		formInputsContainer,
		'username',
		'Username',
		'alternate_email',
	);

	const passwordInput = createInputField(
		formInputsContainer,
		'password',
		'Password',
		'password',
	);

	const errorMessageElement = new ElementBuilder('p')
		.classes(['form-message'])
		.attributes({
			'aria-live': 'polite',
		})
		.appendTo(formElement);

	const menuElement = new ElementBuilder('menu').appendTo(formElement);

	const submitButton = new ElementBuilder('button')
		.id(`${authMode}-submit`)
		.attributes({
			type: 'submit',
		})
		.appendTo(menuElement) as HTMLButtonElement;

	new ElementBuilder('span')
		.classes(['material-symbols-outlined'])
		.text(modeIcon)
		.appendTo(submitButton);

	new ElementBuilder('span')
		.classes(['label'])
		.text(modeTitle)
		.appendTo(submitButton);

	formElement.addEventListener('submit', async event => {
		event.preventDefault();

		errorMessageElement.innerText = '';

		changeInputMode(false);

		const username = usernameInput.value.trim();
		const password = passwordInput.value;

		switch (authMode) {
			case 'login':
				await login(username, password);
				break;
			case 'signup':
				await signup(username, password);
				break;
		}
	});

	async function signup(username: string, password: string) {
		const headers = new Headers();
		headers.append('Content-Type', 'application/vnd.api+json');
		headers.append('Accept', 'application/vnd.api+json');

		const body = {
			data: {
				type: 'users',
				attributes: {
					username,
					displayName: username,
					password,
				},
			},
		};

		const response = await fetch(`/api/users`, {
			method: 'POST',
			headers,
			body: JSON.stringify(body),
			credentials: 'include',
		});

		if (response.status === 409) {
			errorMessageElement.innerText = 'Username is taken';
			changeInputMode(true);
			return;
		}

		if (response.status === 422) {
			errorMessageElement.innerText = (await response.json()).detail;
			changeInputMode(true);
			return;
		}

		if (!response.ok) {
			errorMessageElement.innerText = 'Unexpected error';
			changeInputMode(true);
			return;
		}

		await login(username, password);
	}

	async function login(username: string, password: string) {
		const headers = new Headers();
		headers.append('Content-Type', 'application/vnd.api+json');
		headers.append('Accept', 'application/vnd.api+json');

		const body = {
			data: {
				type: 'sessions',
				attributes: {
					username,
					password,
				},
			},
		};

		const response = await fetch(`/api/sessions`, {
			method: 'POST',
			headers,
			body: JSON.stringify(body),
			credentials: 'include',
		});

		if (response.status === 401) {
			errorMessageElement.innerText = 'Invalid username or password';
			changeInputMode(true);
			return;
		}

		if (!response.ok) {
			errorMessageElement.innerText = 'Unexpected error';
			changeInputMode(true);
			return;
		}

		toast({
			title: 'Login successful',
			message: `Successfully logged in as @${username}`,
		});

		location.hash = '#/home';

		const topNavigation = document.getElementById('top-navigation');
		if (topNavigation) resolveUserMenu(topNavigation);
	}

	function changeInputMode(isActive: boolean) {
		usernameInput.disabled = !isActive;
		passwordInput.disabled = !isActive;
		submitButton.disabled = !isActive;
	}
}

function createInputField(
	container: HTMLElement,
	fieldName: string,
	fieldLabel: string,
	fieldIcon: string,
): HTMLInputElement {
	const inputWrapper = new ElementBuilder('div')
		.classes(['input-wrapper'])
		.appendTo(container);

	new ElementBuilder('span')
		.classes(['material-symbols-outlined', 'input-icon'])
		.text(fieldIcon)
		.appendTo(inputWrapper);

	const inputLabel = new ElementBuilder('label')
		.attributes({
			for: fieldName,
		})
		.appendTo(inputWrapper);

	new ElementBuilder('span')
		.classes(['input-label'])
		.text(fieldLabel)
		.appendTo(inputLabel);

	return new ElementBuilder('input')
		.id(fieldName)
		.attributes({
			type: fieldName === 'password' ? 'password' : 'text',
			required: true,
			placeholder: '',
		})
		.appendTo(inputLabel) as HTMLInputElement;
}

function sentenceCase(text: string): string {
	return text.charAt(0).toUpperCase() + text.slice(1);
}
