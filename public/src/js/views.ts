import { Route } from './router.js';

export const routes: Route[] = [
	{
		path: '/home',
		view: async () => {
			const { Home } = await import('./views/Home.js');
			return Home;
		},
	},
	{
		path: '/problems',
		view: async () => {
			const { Problems } = await import('./views/Problems.js');
			return Problems;
		},
	},
	{
		path: '/problems/recent',
		view: async () => {
			const { Problems } = await import('./views/Problems.js');
			return Problems;
		},
	},
	{
		path: '/problems/difficulty',
		view: async () => {
			const { Problems } = await import('./views/Problems.js');
			return Problems;
		},
	},
	{
		path: '/problems/:problemId',
		view: async () => {
			const { Problem } = await import('./views/Problem.js');
			return Problem;
		},
	},
	{
		path: '/auth/:mode',
		view: async () => {
			const { Auth } = await import('./views/Auth.js');
			return Auth;
		},
	},
	{
		path: '/help',
		view: async () => {
			const { Help } = await import('./views/Help.js');
			return Help;
		},
	},
];
