import { Problem } from './problem.types.js';
import {
	Relationship,
	Resource,
	ResourceIdentifier,
} from './resource.types.js';
import { User } from './user.types.js';

export interface Submission {
	id: string;
	code?: string;
	verdict: string;
	error?: string;
	createdAt: Date;

	// relationships
	problem?: Problem;
	submitter?: User;
}

// JSON responses
export interface SubmissionAttributes {
	code?: string;
	verdict: string;
	error?: string;
	createdAt: string;
}

export interface SubmissionRelationships {
	problem: {
		data: ResourceIdentifier;
	};
	submitter: {
		data: ResourceIdentifier;
	};
	[key: string]: Relationship;
}

export interface SubmissionResource extends Resource<SubmissionAttributes> {
	type: 'submissions';
	relationships: SubmissionRelationships;
}
