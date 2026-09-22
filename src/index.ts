import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import { fastifyStatic } from '@fastify/static';
import pinoPretty from 'pino-pretty';
import path from 'node:path';

import { apiRoutes } from './routes.js';
import { config } from './config.js';

const prettyStream = pinoPretty({
	colorize: true,
	translateTime: 'SYS:standard',
	ignore: 'pid,hostname',
});

const fastify = Fastify({
	logger: { stream: prettyStream },
});

await fastify.register(fastifyCookie);
await fastify.register(apiRoutes, { prefix: '/api' });

const frontendDirectory = path.join(config.root, 'public');
await fastify.register(fastifyStatic, { root: frontendDirectory });

fastify.get('/', (request, reply) => {
	return reply.sendFile('index.html');
});

fastify.setNotFoundHandler((request, reply) => {
	if (request.url.startsWith('/api')) {
		return reply.code(404).send({
			error: {
				code: 'NOT_FOUND',
				message: 'API endpoint not found',
			},
		});
	}

	return reply.code(404).send('Not found');
});

async function start() {
	try {
		await fastify.listen({
			host: config.server.host,
			port: config.server.port,
		});
	} catch (error) {
		fastify.log.error(error);
		process.exit(1);
	}
}

start();
