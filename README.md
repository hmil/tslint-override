TSLint override rule
====================

Finally brings support for the `override` keyword to TypeScript!

[![Build Status](https://travis-ci.org/hmil/tslint-override.svg?branch=master)](https://travis-ci.org/hmil/tslint-override)

## Why

Most modern object oriented languages provide an `override` keyword to prevent misuse of the override mechanism. However, support for the `override` keyword in typescript [is nowhere in sight](https://github.com/Microsoft/TypeScript/issues/2000), and in the meantime, TypeScript programmers are left with no ideal solution to this problem.

Here are some reasons to use this rule:
- You may want to override a method, but introduce a typo in the method name and end up creating a new method by accident.
- You accidentally override a method of a base class because the method you just added shares the same name and has a compatible signature.
- A library author introduces a new method to a base class, which gets accidentally overridden by a method you wrote in a subclass in the past.

## How

```sh
npm install --save-dev tslint-override
```

Then add a `rules` and a `rulesDirectory` entry to your `tslint.json`.

```json
{
    "rules": {

        /* other rules here */

        "override-jsdoc-tag": true,
    },


    "rulesDirectory": [
        "tslint-override"
    ]
}
```

This rule **requires type information**, which means that errors will not show in VSCode (see [vscode-tslint#70](https://github.com/Microsoft/vscode-tslint/issues/70) ). It will work out of the box when running `tslint` however.

## What

TODO: Extract example from test cases

## Contributing, Credits, etc

Author: Hadrien Milano <github.com/hmil>  
License: MIT

Please star this repo if you like it, and submit code and issues if something doesn't work.
