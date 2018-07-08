TSLint override rule
====================

Finally brings support for the `override` keyword to TypeScript!

[![Build Status](https://travis-ci.org/hmil/tslint-override.svg?branch=master)](https://travis-ci.org/hmil/tslint-override)

![preview](https://github.com/hmil/tslint-override/blob/master/resources/story.gif?raw=true)

## Why

Most modern object oriented languages provide an `override` keyword to prevent misuse of the override mechanism. However, support for the `override` keyword in TypeScript [is nowhere in sight](https://github.com/Microsoft/TypeScript/issues/2000), and in the meantime, TypeScript programmers are left with no ideal solution to this problem.

Here are some reasons to use this rule:
- You may want to override a method, but introduce a typo in the method name and end up creating a new method by accident.
- You accidentally override a method of a base class because the method you just added shares the same name and has a compatible signature.
- A library author introduces a new method to a base class, which gets accidentally overridden by a method you wrote in a subclass in the past.

## How

```sh
npm install --save-dev tslint-override
```

Then, in your `tslint.json`, extend the tslint-override configuration.
```json
{
    "extends": [
        "tslint-override"
    ]
}
```

### IDE support

This rule *requires type information*. If you are still using [vscode-tslint](https://github.com/Microsoft/vscode-tslint) you should switch over to using the [tslint-language-service](https://github.com/angelozerr/tslint-language-service) because vscode-tslint won't show the errors reported by tslint-override.

## What

```typescript
export class Basic {

    public overridePlease(): void { }

    public doNotOverride(): void { }
}

export class Child extends Basic {

    /** @override */
    public overridePlease(): void { }

    /** @override */
    public overidePlease(): void { } // ERROR: Method with @override tag is not overriding anything

    public doNotOverride(): void { } // ERROR: Method Child#doNotOverride is overriding Basic#doNotOverride. Use the @override JSDoc tag if the override is intended
}
```

## Contributing, Credits, etc

Author: Hadrien Milano <github.com/hmil>  
License: MIT

Please star this repo if you like it, and submit code and issues if something doesn't work.
