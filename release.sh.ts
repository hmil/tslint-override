import * as fs from 'fs';
import * as inquirer from 'inquirer';
import { echo, exec } from 'shelljs';

const prompt = inquirer.createPromptModule();

(async () => {
    if (exec('git status --porcelain').stdout.trim() !== '') {
        echo('Your repository is dirty. Aborting');
        process.exit(1);
        return;
    }

    const { version, message } = await prompt<{version: string, message: string}>([{
        type: 'input',
        name: 'version',
        message: 'Version?',
        filter: (val) => {
        return val.toLowerCase();
        }
    }, {
        type: 'input',
        name: 'message',
        message: 'Short release message'
    }]);

    echo(`About to release ${version}: ${message}. Proceed? [y/N]`);

    const { proceed } = await prompt<{proceed: boolean}>([{
        type: 'confirm',
        name: 'proceed',
        message: 'Proceed?'
    }]);

    if (proceed !== true) {
        echo('Aborting');
        process.exit(1);
        return;
    }

    const pkgJSON = require('./package.json');
    pkgJSON.version = version;
    fs.writeFileSync('./package.json', JSON.stringify(pkgJSON, null, 4), { encoding: 'utf-8' });

    exec(`git add -u && git commit -m "release v${version}"`);
    exec(`git tag -s -m "${message}" "v${version}"`);
    exec('git push --tags master');

})();
