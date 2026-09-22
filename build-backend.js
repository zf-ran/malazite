import fs from 'node:fs';
import path from 'node:path';

const srcDirectory = path.resolve('./src');
const outDirectory = path.resolve('./dist');

const isMinify = process.argv.includes('--minify');

fs.rmSync(outDirectory, { recursive: true, force: true });

const result = await Bun.build({
	entrypoints: [path.join(srcDirectory, 'index.ts')],
	outdir: outDirectory,

	target: 'node',
	format: 'esm',
	splitting: false,
	minify: isMinify,
	sourcemap: 'none',

	naming: {
		entry: '[dir]/[name].js',
	},
	root: srcDirectory,
});

if (!result.success) {
	console.error('Backend compilation failed:');
	for (const message of result.logs) {
		console.error(message);
	}
	process.exit(1);
}

console.log('Backend compilation complete.');
