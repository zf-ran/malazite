import { JSONDocument } from '../types/resource.types';
import { SessionResource } from '../types/session.types';
import { User, UserResource } from '../types/user.types';

export function getElementById<T extends HTMLElement>(id: string): T {
	const element = document.getElementById(id);

	if (!element) throw new Error(`Element with id '${id}' not found`);

	return element as T;
}

export function loadStyle(id: string, href: string): Promise<HTMLLinkElement> {
	return new Promise((resolve, reject) => {
		const previous = document.getElementById(id) as HTMLLinkElement;

		if (previous) {
			resolve(previous);
			return;
		}

		const linkElement = document.createElement('link');

		linkElement.rel = 'stylesheet';
		linkElement.href = href;
		linkElement.id = id;
		linkElement.onload = () => resolve(linkElement);
		linkElement.onerror = () => reject(new Error(`Failed to load ${href}`));

		document.head.append(linkElement);
	});
}

export function loadScript(
	id: string,
	src: string,
): Promise<HTMLScriptElement> {
	return new Promise((resolve, reject) => {
		const previous = document.getElementById(id) as HTMLScriptElement;

		if (previous) {
			resolve(previous);
			return;
		}

		const scriptElement = document.createElement('script');

		scriptElement.src = src;
		scriptElement.async = true;
		scriptElement.id = id;
		scriptElement.onload = () => resolve(scriptElement);
		scriptElement.onerror = () => reject(new Error(`Failed to load ${src}`));

		document.head.append(scriptElement);
	});
}

let currentUser: User | null | undefined;
let userRequest: Promise<User | null> | undefined;

export async function getUser(): Promise<User | null> {
	if (currentUser !== undefined) return currentUser;
	if (userRequest) return await userRequest;

	userRequest = loadUser();
	currentUser = await userRequest;

	return currentUser;
}

async function loadUser(): Promise<User | null> {
	try {
		const headers = new Headers();
		headers.append('Accept', 'application/vnd.api+json');

		const query = new URLSearchParams();
		query.append('include', 'user');
		query.append('fields[sessions]', 'createdAt,user');

		const response = await fetch(`/api/sessions/me?${query}`, {
			method: 'GET',
			headers,
		});

		if (!response.ok) return null;

		const json = (await response.json()) as JSONDocument<
			SessionResource,
			UserResource
		>;

		const data = json.data;
		const userResource = json.included?.find(
			resource => resource.id === data.relationships.user.data.id,
		);

		if (!userResource) return null;

		return {
			id: userResource.id,
			username: userResource.attributes.username,
			displayName: userResource.attributes.displayName,
			createdAt: userResource.attributes.createdAt,
		};
	} catch {
		return null;
	}
}

export function clearUser(): void {
	currentUser = undefined;
	userRequest = undefined;
}
