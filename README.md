TSLint override rule
====================

Finally brings support for the `override` keyword to TypeScript!

[![Build Status](https://travis-ci.org/hmil/tslint-override.svg?branch=master)](https://travis-ci.org/hmil/tslint-override)

## What

```typescript
export class Basic {
    public overridePlease(): void { }
    public doNotOverride(): void { }
}

export class Child extends Basic {
    public doNotOverride(): void { } // ERROR: Method Child#doNotOverride is overriding Basic#doNotOverride. Use the @override JSDoc tag if the override is intended

    // Make it explicit that you intend to override this member
    /** @override */ public overridePlease(): void { }

    // Alternatively, you can use the decorator syntax
    @override public overridePlease(): void { }

    // Typos won't bother you anymore
    /** @override */ public overidePlease(): void { } // ERROR: Method with @override tag is not overriding anything
}
```


## Why

Most modern object oriented languages provide an `override` keyword to prevent misuse of the override mechanism. However, support for the `override` keyword in TypeScript [is nowhere in sight](https://github.com/Microsoft/TypeScript/issues/2000), and in the meantime, TypeScript programmers are left with no ideal solution to this problem.

Here are some reasons to use this rule:
- You may want to override a method, but introduce a typo in the method name and end up creating a new method by accident.
- You accidentally override a method of a base class because the method you just added shares the same name and has a compatible signature.
- A library author introduces a new method to a base class, which gets accidentally overridden by a method you wrote in a subclass in the past.
- ...


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

### Using decorators

If you want to use the decorator syntax, you will need the `override` decorator in your scope. There are two ways to do this:

#### Let `tslint-override` do the job

In your application entry point, include the following import.

```typescript
import 'tslint-override/register';
```

You can then use `@override` anywhere else in your code:

```typescript
class Foo extends Basic {
    @override public doStuff() { }
}
```

#### Define it yourself

Alternatively, you can define it yourself, but make sure it is in scope where you need it.

```typescript
function override(_target: any, _propertyKey: string, _descriptor?: PropertyDescriptor) { /* noop */ }
```

If your love for java will never die, you can define this with a capital 'O' and use `@Override` in your code instead.

---

Also, if you do not need support for jsdoc tags, you can deactivate it by using this config in `tslint.json`:

```json
    "rules": {
        "explicit-override": [ true, "decorator" ]
    }
```

### IDE support

This rule *requires type information*. If you are still using [vscode-tslint](https://github.com/Microsoft/vscode-tslint) you should switch over to using the [tslint-language-service](https://github.com/angelozerr/tslint-language-service) because _vscode-tslint_ won't show the errors reported by _tslint-override_.

Example in VSCode:
![preview](https://github.com/hmil/tslint-override/blob/master/resources/story.gif?raw=true)

## Contributing, Credits, etc

Author: Hadrien Milano <github.com/hmil>  
License: MIT

Please star this repo if you like it, and submit code and issues if something doesn't work.
