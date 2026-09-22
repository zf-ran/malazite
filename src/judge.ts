import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { SubmissionVerdict } from './types/models.js';
import crypto from 'node:crypto';
import { config } from './config.js';

export interface JudgeResult {
	status:
		| 'ACCEPTED'
		| 'WRONG_ANSWER'
		| 'TIME_LIMIT_EXCEEDED'
		| 'MEMORY_LIMIT_EXCEEDED'
		| 'RUNTIME_ERROR'
		| 'COMPILE_ERROR'
		| 'SYSTEM_ERROR';
	verdict: SubmissionVerdict;
	error?: string;
}

async function getTempDir(): Promise<string> {
	try {
		if (await fs.exists('/dev/shm')) return '/dev/shm';
	} catch {
		return os.tmpdir();
	}

	return os.tmpdir();
}

export async function runJudge(
	code: string,
	problemId: number,
	timeLimitSec: number = 5,
	memoryLimitMiB: number = 256,
): Promise<JudgeResult> {
	const tempDir = await getTempDir();
	const id = crypto.randomBytes(16).toString('hex');

	const codePath = path.join(tempDir, `submission-${Date.now()}-${id}.py`);

	const problemPath = path.join(config.root, 'problems', problemId.toString());
	const graderPath = path.join(problemPath, 'grader.py');
	const testcasesPath = path.join(problemPath, 'testcases.json');

	try {
		await fs.writeFile(codePath, code, 'utf-8');

		return await new Promise<JudgeResult>(resolve => {
			const args = [
				path.join(config.root, 'judge', 'safe_runner.py'),
				codePath,
				graderPath,
				testcasesPath,
				memoryLimitMiB.toString(),
			];

			const child = execFile(
				'python3',
				args,
				{
					timeout: (timeLimitSec + 1) * 1_000,
					maxBuffer: (memoryLimitMiB + 10) * 1024 * 1024,
				},
				(error, stdout, stderr) => {
					if (error) {
						if (error.killed || error.signal === 'SIGTERM') {
							return resolve({
								status: 'TIME_LIMIT_EXCEEDED',
								verdict: 'TLE',
							});
						}

						if (
							error.signal === 'SIGKILL'
							|| error.code === 137
							|| error.code === 9
						) {
							return resolve({
								status: 'MEMORY_LIMIT_EXCEEDED',
								verdict: 'MLE',
							});
						}

						if (!stdout.trim()) {
							return resolve({
								status: 'RUNTIME_ERROR',
								verdict: 'RTE',
								error:
									stderr.trim() || `Process exited with code ${error.code}`,
							});
						}
					}

					try {
						const data = JSON.parse(stdout);

						if (data.status === 'COMPILE_ERROR') {
							return resolve({
								status: 'COMPILE_ERROR',
								verdict: 'CE',
								error: data.error,
							});
						}

						if (data.status === 'RUNTIME_ERROR') {
							return resolve({
								status: 'RUNTIME_ERROR',
								verdict: 'RTE',
								error: data.error || 'Unknown runtime exception',
							});
						}

						if (data.status === 'MEMORY_LIMIT_EXCEEDED') {
							return resolve({
								status: 'MEMORY_LIMIT_EXCEEDED',
								verdict: 'MLE',
							});
						}

						const results = data.results || [];
						const allPassed =
							results.length > 0
							&& results.every(
								(tc: { passed?: boolean }) => tc.passed === true,
							);

						if (allPassed) {
							return resolve({
								status: 'ACCEPTED',
								verdict: 'AC',
							});
						} else {
							return resolve({
								status: 'WRONG_ANSWER',
								verdict: 'WA',
							});
						}
					} catch (error) {
						return resolve({
							status: 'SYSTEM_ERROR',
							verdict: 'SE',
							error: 'Invalid JSON output from runner',
						});
					}
				},
			);
		});
	} catch (error) {
		return {
			status: 'SYSTEM_ERROR',
			verdict: 'SE',
			error: String(error),
		};
	} finally {
		await fs.unlink(codePath).catch(() => {});
	}
}
