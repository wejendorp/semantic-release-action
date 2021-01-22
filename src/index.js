const core = require('@actions/core');
const exec = require('@actions/exec');
const {
	handleBranchesOption,
	handleDryRunOption,
	handleExtends,
} = require('./handleOptions');
const outputs = require('./outputs.json');
const inputs = require('./inputs.json');

/**
 * Release main task
 * @returns {Promise<void>}
 */
const release = async () => {
	core.setOutput(outputs.new_release_published, 'false');

	const semanticRelease = require('semantic-release');
	const result = await semanticRelease({
		...handleBranchesOption(),
		...handleDryRunOption(),
		...handleExtends(),
		plugins: [
			'@semantic-release/commit-analyzer',
			'@semantic-release/release-notes-generator',
			[
				'@semantic-release/npm',
				{
					npmPublish: false,
				},
			],
			'@semantic-release/github',
		],
	});

	const npmPublish = core.getInput(inputs.npm_publish) === 'true';
	const registry =
		core.getInput(inputs.registry) || 'https://registry.npmjs.com/';

	if (result.nextRelease && npmPublish) {
		await exec.exec(
			`npm publish --tag=${
				result.nextRelease.channel || 'latest'
			} --registry=${registry}`,
		);
	}

	await collectOutput(result);
};

const collectOutput = async (result) => {
	if (!result) {
		core.debug('No release published.');
		return Promise.resolve();
	}

	const { lastRelease, commits, nextRelease, releases } = result;

	if (!nextRelease) {
		core.debug('No release published.');
		return Promise.resolve();
	}

	core.debug(
		`Published ${nextRelease.type} release version ${nextRelease.version} containing ${commits.length} commits.`,
	);

	if (lastRelease.version) {
		core.debug(`The last release was "${lastRelease.version}".`);
	}

	for (const release of releases) {
		core.debug(
			`The release was published with plugin "${release.pluginName}".`,
		);
	}

	const { version, channel, notes } = nextRelease;
	const [major, minor, patch] = version.split(/\.|-|\s/g, 3);

	// set outputs
	core.setOutput(outputs.new_release_published, 'true');
	core.setOutput(outputs.new_release_version, version);
	core.setOutput(outputs.new_release_major_version, major);
	core.setOutput(outputs.new_release_minor_version, minor);
	core.setOutput(outputs.new_release_patch_version, patch);
	core.setOutput(outputs.new_release_channel, channel);
	core.setOutput(outputs.new_release_notes, notes);
};

module.exports = () => {
	core.debug('Initialization successful');
	release().catch(core.setFailed);
};
