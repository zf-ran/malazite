import { Resource } from './resource.types.js';

export interface User {
	id: string;
	username: string;
	displayName?: string;
	createdAt: string;
}

// JSON responses
export interface UserAttributes {
	username: string;
	displayName: string;
	createdAt: string;
}

export interface UserResource extends Resource<UserAttributes> {
	type: 'problems';
}
