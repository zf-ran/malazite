import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

interface MalaziteConfig {
	server: {
		port: number;
		host: string;
	};
	root: string;
	database: {
		filename: string;
	};
}

const DEFAUT_CONFIG: MalaziteConfig = {
	server: {
		port: 3000,
		host: '0.0.0.0',
	},
	root: path.resolve(process.cwd()),
	database: {
		filename: 'data.db',
	},
};

const configPath = path.join(DEFAUT_CONFIG.root, 'config.yaml');

function fetchConfig(): MalaziteConfig {
	try {
		if (fs.existsSync(configPath)) {
			const fileContent = fs.readFileSync(configPath, 'utf8');

			const userConfig = YAML.parse(fileContent);

			const config: MalaziteConfig = {
				...DEFAUT_CONFIG,
				server: {
					...DEFAUT_CONFIG.server,
					...userConfig.server,
				},
				database: {
					...DEFAUT_CONFIG.database,
					...userConfig.database,
				},
				...userConfig,
			};

			return config;
		} else {
			console.info(
				'Config file `config.yaml` not found. Generating default configuration.',
			);

			const yamlString = YAML.stringify(DEFAUT_CONFIG);

			fs.writeFileSync(configPath, yamlString, 'utf8');

			return DEFAUT_CONFIG;
		}
	} catch (error) {
		console.error(error);
		console.error('Failed to parse `config.yaml`, using defaults.');
	}

	return DEFAUT_CONFIG;
}

export const config: MalaziteConfig = fetchConfig();
