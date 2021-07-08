const core = require('@actions/core');
const exec = require('@actions/exec');
const github = require('@actions/github');
const {
	handleBranchesOption,
	handleDryRunOption,
	handleExtends,
} = require('./handleOptions');
const outputs = require('./outputs.json');
const inputs = require('./inputs.json');
/**
 * @typedef {import('semantic-release').Result} Result
 */

/**
 * Release main task
 * @returns {Promise<void>}
 */
const release = async () => {
	core.setOutput(outputs.new_release_published, 'false');

	const semanticRelease = require('semantic-release');
	if (handleDryRunOption().dryRun) {
		// make semantic-release believe we're running on master
		process.env.GITHUB_EVENT_NAME = 'totally-not-a-pr';
		process.env.GITHUB_REF = 'master';
	}
	const npmPublish = core.getInput(inputs.npm_publish) === 'true';
	const registry =
		core.getInput(inputs.registry) || 'https://registry.npmjs.com/';

	process.env.NPM_CONFIG_REGISTRY = registry;
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
					npmPublish,
				},
			],
			'@semantic-release/github',
		],
	});

	await collectOutput(result);
	await updateStatus(result);
};

const updateStatus = async (/** @type {Result} */ result) => {
	const checkName = core.getInput(inputs.check_name);

	if (!checkName) {
		return;
	}

	const octokit = github.getOctokit(process.env.GITHUB_TOKEN);
	const [gitHubRepoOwner, gitHubRepoName] =
		process.env.GITHUB_REPOSITORY.split('/');

	//
	let gitHubSha = process.env.GITHUB_SHA;
	try {
		const event = require(process.env.GITHUB_EVENT_PATH);
		gitHubSha = event.pull_request.head.sha;
	} catch (e) {
		core.debug('Could not get PR sha, using env.GITHUB_SHA for status');
	}

	let title = 'No new release';
	let summary =
		'No new release will be published. Add some [conventional commits](https://www.conventionalcommits.org/) to ';
	if (result && result.nextRelease) {
		title = `${result.nextRelease.type} release`;
		summary = [
			`Found the following [conventional commits](https://www.conventionalcommits.org/) to trigger a ${result.nextRelease.type} release.`,
			result.nextRelease.notes,
		].join('\n\n');
	}

	await octokit.checks.create({
		owner: gitHubRepoOwner,
		repo: gitHubRepoName,
		name: checkName,
		head_sha: gitHubSha,
		status: 'completed',
		conclusion: 'success',
		output: {
			title,
			summary,
		},
	});
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
		`Published ${nextRelease.type} release version ${nextRelease.version} containing ${commits.length} commits.`
	);

	if (lastRelease.version) {
		core.debug(`The last release was "${lastRelease.version}".`);
	}

	for (const release of releases) {
		core.debug(
			`The release was published with plugin "${release.pluginName}".`
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
