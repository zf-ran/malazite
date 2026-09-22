import {
	Relationship,
	Resource,
	ResourceIdentifier,
} from './resource.types.js';

export interface Session {
	id: string;
	token: string;
}

// JSON responses
export interface SessionAttributes {
	token: string;
}

export interface SessionRelationships {
	user: {
		data: ResourceIdentifier;
	};
	[key: string]: Relationship;
}

export interface SessionResource extends Resource<SessionAttributes> {
	type: 'sessions';
	relationships: SessionRelationships;
}
