const exec = require('@actions/exec');
const path = require('path');

const run = async () => {
	// Install Dependencies
	{
		const { stdout, stderr } = await exec.exec('npm ci --only=prod', {
			cwd: path.resolve(__dirname),
		});
		console.log(stdout);
		if (stderr) {
			return Promise.reject(stderr);
		}
	}

	require('./src/index')();
};

run().catch(console.error);