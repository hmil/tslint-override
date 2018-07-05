import * as fs from 'fs';
import * as inquirer from 'inquirer';
import { echo, exec } from 'shelljs';

const prompt = inquirer.createPromptModule();

(async () => {
    if (exec('git status --porcelain').stdout.trim() !== '') {
        const { releaseDirty } = await prompt<{releaseDirty: string}>([{
            default: false,
            message: `Your git repository is dirty. You should commit all local changes before moving on. Proceed anyway?`,
            name: 'releaseDirty',
            type: 'confirm'
        }]);
        if (!releaseDirty) {
            process.exit(1);
            return;
        }
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

    const { proceed } = await prompt<{proceed: string}>([{
        type: '',
        name: 'proceed',
        message: 'Version (ex: 1.2.3-tag.4)?',
        filter: (val) => val.toLowerCase()
    }]);

    if (proceed !== 'yes') {
        echo('Aborting');
        return;
    }

    const pkgJSON = require('./package.json');
    pkgJSON.version = version;
    fs.writeFileSync('./package.json', JSON.stringify(pkgJSON, null, 4), { encoding: 'utf-8' });

    exec(`git add -u && git commit -m "release v${version}"`);
    exec(`git tag -s -m "${message}" "v${version}"`);
    exec('git push --tags');

})();
