import path from 'node:path';
import fs from 'node:fs';

import { Glob } from 'bun';

const srcDirectory = path.resolve('./public/src');
const outDirectory = path.resolve('./public/dist');

//* MATHJAX
fs.cpSync('node_modules/mathjax', 'public/dist/mathjax', { recursive: true });
fs.cpSync('node_modules/@mathjax', 'public/dist/@mathjax', { recursive: true });

const mathjaxTsGlob = new Glob('@mathjax/**/*.ts');

const mathjaxTsFiles = await Array.fromAsync(
	mathjaxTsGlob.scan({ cwd: outDirectory, absolute: false }),
);

mathjaxTsFiles.map(f => path.join(outDirectory, f)).forEach(f => fs.rmSync(f));

//* BUILD
const tsGlob = new Glob('**/*.ts');
const cssGlob = new Glob('**/*.css');

const tsFiles = await Array.fromAsync(
	tsGlob.scan({ cwd: srcDirectory, absolute: false }),
);

const cssFiles = await Array.fromAsync(
	cssGlob.scan({ cwd: srcDirectory, absolute: false }),
);

const entrypoints = [
	...tsFiles.map(file => path.join(srcDirectory, file)),
	...cssFiles.map(file => path.join(srcDirectory, file)),
];

const isWatch = process.argv.includes('--watch');
const isMinify = process.argv.includes('--minify');

console.log(`Compiling ${entrypoints.length} frontend entry points...`);

fs.rmSync(outDirectory, { recursive: true, force: true });

await Bun.build({
	entrypoints,
	outdir: outDirectory,
	splitting: true,
	minify: isMinify,
	watch: isWatch,
	naming: {
		entry: '[dir]/[name].[ext]',
	},
	root: srcDirectory,
});

console.log('Frontend compilation complete.');
