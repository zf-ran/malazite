export type RouteParams = Record<string, string>;
export type RouteHandler = (
	container: HTMLElement,
	params: RouteParams,
) => void | Promise<void>;
export type RouteView = () => Promise<RouteHandler>;

export interface Route {
	path: string;
	view: RouteView;
}

export class Router {
	private routes: Route[];
	private container: HTMLElement;

	constructor(routes: Route[], container: HTMLElement) {
		this.routes = routes;
		this.container = container;

		window.addEventListener('hashchange', () => this.resolveRoute());

		document.body.addEventListener('click', (event: MouseEvent) => {
			const target = (event.target as HTMLElement).closest('[data-link]');

			if (target instanceof HTMLAnchorElement) {
				event.preventDefault();

				this.navigateTo(target.getAttribute('href') || '/');
			}
		});
	}

	public navigateTo(url: string): void {
		const path = url.startsWith('#') ? url.slice(1) : url;
		history.pushState(null, '', `#${path || '/home'}`);
		this.resolveRoute();
	}

	public async resolveRoute(): Promise<void> {
		const path = window.location.hash.slice(1) || '/home';
		const match = this.routes
			.map(route => ({ route, params: this.matchPath(route.path, path) }))
			.find(result => result.params !== null);
		const route = match?.route || this.routes[0];
		const params = match?.params || {};

		this.container.innerHTML = '';
		this.container.dataset.path = route.path;
		const view = await route.view();
		await view(this.container, params);

		const navigationButtons = document.getElementsByClassName('navigation');

		for (const navigationButton of navigationButtons) {
			const navigationPath = navigationButton
				.querySelector<HTMLAnchorElement>('a')
				?.hash.slice(1);

			if (navigationPath === path) navigationButton.classList.add('active');
			else navigationButton.classList.remove('active');
		}
	}

	private matchPath(pattern: string, path: string): RouteParams | null {
		const patternParts = pattern.split('/').filter(Boolean);
		const pathParts = path.split('/').filter(Boolean);

		if (patternParts.length !== pathParts.length) return null;

		const params: RouteParams = {};

		for (let index = 0; index < patternParts.length; index++) {
			const patternPart = patternParts[index];
			const pathPart = pathParts[index];

			if (patternPart.startsWith(':'))
				params[patternPart.slice(1)] = decodeURIComponent(pathPart);
			else if (patternPart !== pathPart) return null;
		}

		return params;
	}
}
