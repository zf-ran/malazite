import { Router } from './router.js';
import { routes } from './views.js';

import { getElementById } from './modules/utils.js';
import { resolveUserMenu } from './components/user-menu.js';

document.addEventListener('DOMContentLoaded', () => {
	const root = document.getElementById('app');
	const topNavigation = document.getElementById('top-navigation');

	if (!root) throw new Error('No ROOT found');

	const router = new Router(routes, root);
	router.resolveRoute();

	resolveSidebar();

	if (topNavigation) resolveUserMenu(topNavigation);
});

function resolveSidebar() {
	//* SIDE NAVIGATION
	const sidebar = getElementById('sidebar');
	const openSidebarButton = getElementById('open-sidebar');
	const closeSidebarButton = getElementById('close-sidebar');

	openSidebarButton.addEventListener('click', () => {
		openSidebar();
	});

	closeSidebarButton.addEventListener('click', () => {
		closeSidebar();
	});

	const anchorElements = document.querySelectorAll('a[data-link]');

	for (const anchorElement of anchorElements) {
		anchorElement.addEventListener('click', () => {
			closeSidebar();
		});
	}

	function openSidebar() {
		sidebar.classList.add('open');
		sidebar.ariaHidden = 'false';
		openSidebarButton.ariaExpanded = 'true';
		closeSidebarButton.focus();
	}

	function closeSidebar() {
		sidebar.classList.remove('open');
		sidebar.ariaHidden = 'true';
		openSidebarButton.ariaExpanded = 'false';
		openSidebarButton.focus();
	}
}
