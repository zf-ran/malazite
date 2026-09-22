import {
	Relationship,
	Resource,
	ResourceIdentifier,
} from './resource.types.js';
import { User } from './user.types.js';

export interface Problem {
	id: string;
	title: string;
	statement?: string;
	createdAt: Date;

	// relationships
	problemsetter: User;
}

// JSON responses
export interface ProblemAttributes {
	title: string;
	statement?: string;
	createdAt: string;
}

export interface ProblemRelationships {
	problemsetter: {
		data: ResourceIdentifier;
	};
	[key: string]: Relationship;
}

export interface ProblemResource extends Resource<ProblemAttributes> {
	type: 'problems';
	relationships: ProblemRelationships;
}
