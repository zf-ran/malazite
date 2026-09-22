export interface ResourceIdentifier {
	type: string;
	id: string;
}

export interface Relationship {
	links?: {
		self?: string;
		related?: string;
	};
	data: ResourceIdentifier | ResourceIdentifier[] | null;
}

export interface Resource<T = Record<string, unknown>> {
	type: string;
	id: string;
	attributes: T;
	relationships?: Record<string, Relationship>;
	links?: {
		self?: string;
	};
}

export interface JSONDocument<D = Resource | Resource[], I = Resource> {
	data: D;
	included?: I[];
	links?: {
		self?: string;
		first?: string;
		last?: string;
		prev?: string;
		next?: string;
	};
	meta?: {
		[key: string]: unknown;
	};
}

export interface JSONError {
	status: string;
	code: string;
	title: string;
	detail: string;
	source?: {
		path?: string;
		parameter?: string;
		header?: string;
	};
}
