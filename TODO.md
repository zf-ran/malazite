# TODO

## General

- [ ] Test `GET /api/problems/X` where the problem statement are nonexistant.
- [ ] Split `/src/schemas/schemas.ts`.
- [ ] Add unique submission code checking.
	- [ ] Implement code normalization
	- [ ] Implement code hashing.
- [ ] Consider moving to Temml for math rendering.

## Routes

- [ ] `/api`
	- [x] `/users`
		- [x] GET
		- [x] POST: Sign-up
	- [x] `/users/$`
		- [x] GET
	- [ ] `/problems`
		- [x] GET
		- [ ] POST: Uploading a problem
		- [ ] DELETE
	- [x] `/problems/$`
		- [x] GET
	- [x] `/submissions`
		- [x] GET: List submissions
		- [x] POST: Uploading a source code
	- [x] `/submissions/$`
		- [x] GET: Submission detail
	- [x] `/sessions`
		- [x] POST: Login
	- [x] `/sessions/me`
		- [x] GET: Session
		- [x] DELETE: Logout

## JSON:API

API are `application/vnd.api+json` compliant.

### Types

- `users`
	- **id**: string
	- **attributes**
		- **username**: string
			- alphanumeric
			- digits
			- underscores
			- period
			- length 3 between 30 inclusive
		- **displayName**: string
		- **createdAt**: string (ISO 8601)
- `problems`
	- **id**: string
	- **attributes**
		- **title**: string
		- **createdAt**: string (ISO 8601)
	- **relationships**
		- **problemsetter**
			- **data**: User(!attributes)
	- **included**?: User[]
- `submissions`
	- **id**: string
	- **attributes**:
		- **code**: string
		- **verdict**: string
		- **createdAt**: string (ISO 8601)
	- **relationships**
		- **submitter**
			- **data**: User(!attributes)
		- **problem**
			- **data**: Problem(!attributes)
	- **included**?: User[] | Problem[]
- `sessions`
	- **id**: string
	- **attributes**:
		- **token**?: string (Token)
		- **createdAt**: string (ISO 8601)
	- **relationships**
		- **user**
			- **data**: User(!attributes)
	- **included**?: User[]

## Submissions

### Verdicts

- [x] `AC` Accepted
	- The submission code passes all test-cases.
- [x] `WA` Wrong Answer
	- The submission code has at least one test-case wrong.
- [x] `CE` Compile Error
	- The submission code failed to compile, maybe because of a syntax error.
- [x] `RTE` Runtime Error
	- The submission code failed to run.
	- The submission code doesn't have the required function name.
- [x] `TLE` Time Limit Exceeded
	- The submission code ran for too long.
	- The default time limit is 5 seconds.
- [x] `MLE` Memory Limit Exceeded
	- The submission code uses too much memory.
	- The default memory limit is 256 MiB.
- [x] `SE` System Error
	- The system failed to judge.
	- This is caused by unexpected errors.
- [x] `PE` Pending
	- The submission code is still judging and the verdict will update after the judging is done.
