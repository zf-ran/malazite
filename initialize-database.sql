CREATE TABLE IF NOT EXISTS users (
	id            INTEGER PRIMARY KEY AUTOINCREMENT,
	username      TEXT UNIQUE NOT NULL,
	display_name  TEXT NOT NULL,
	password_hash TEXT NOT NULL,
	salt          TEXT NOT NULL,
	created_at    TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
	id         INTEGER PRIMARY KEY AUTOINCREMENT,
	token      TEXT UNIQUE NOT NULL,
	user_id    INTEGER NOT NULL,
	created_at TEXT DEFAULT CURRENT_TIMESTAMP,

	FOREIGN KEY (user_id) REFERENCES users(id)
		ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS problems (
	id               INTEGER PRIMARY KEY AUTOINCREMENT,
	problemsetter_id INTEGER NOT NULL,
	title            TEXT NOT NULL,
	created_at       TEXT DEFAULT CURRENT_TIMESTAMP,

	FOREIGN KEY (problemsetter_id) REFERENCES users(id)
		ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS submissions (
	id           INTEGER PRIMARY KEY AUTOINCREMENT,
	submitter_id INTEGER NOT NULL,
	problem_id   INTEGER NOT NULL,
	code         TEXT NOT NULL,
	verdict      TEXT NOT NULL,
	error        TEXT DEFAULT "",
	created_at   TEXT DEFAULT CURRENT_TIMESTAMP,

	FOREIGN KEY (submitter_id) REFERENCES users(id)
		ON DELETE CASCADE,

	FOREIGN KEY (problem_id) REFERENCES problems(id)
		ON DELETE CASCADE
);
