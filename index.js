const path = require('path');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

const run = async () => {
	// Install Dependencies
	{
		const { stdout, stderr } = await exec('npm ci --only=prod --silent', {
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
