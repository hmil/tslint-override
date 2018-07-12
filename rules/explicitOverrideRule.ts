import * as Lint from 'tslint';
import * as ts from 'typescript';

type AllClassElements =
        ts.MethodDeclaration |
        ts.PropertyDeclaration |
        ts.GetAccessorDeclaration |
        ts.SetAccessorDeclaration |
        ts.IndexSignatureDeclaration |
        ts.ConstructorDeclaration;

type OverrideableElement =
        ts.MethodDeclaration |
        ts.PropertyDeclaration |
        ts.GetAccessorDeclaration |
        ts.SetAccessorDeclaration;

type OverrideKeyword =
        ts.Decorator |
        ts.JSDocTag;

function isSomeClassElement(el: ts.Node): el is AllClassElements {
    return ts.isClassElement(el);
}

const OPTION_DECORATOR = 'decorator';
const OPTION_JSDOC_TAG = 'jsdoc';

interface IOptions {
    useJsdocTag: boolean;
    useDecorator: boolean;
}

export class Rule extends Lint.Rules.TypedRule {
    public static metadata: Lint.IRuleMetadata = {
        ruleName: 'override-jsdoc-tag',
        description: 'Uses the @override JSDoc tag to prevent override mistakes',
        descriptionDetails: Lint.Utils.dedent`
            Prevents accidental overriding of a base classe's method,
            as well as missing base methods for intended overrides.
        `,
        rationale: 'Catches a class of errors that TypeScript can not catch.',
        optionsDescription: Lint.Utils.dedent`
            The following options can be used and combined. By default, both are enabled.

            * \`"${OPTION_DECORATOR}"\` Uses a decorator: \`@override method() { }\`
            * \`"${OPTION_JSDOC_TAG}"\` (default) Uses a jsdoc tag: \`/** @override */ method() { }\`
        `,
        options: {
            type: 'array',
            items: {
                type: 'string',
                enum: [OPTION_DECORATOR, OPTION_JSDOC_TAG],
            },
            minLength: 1,
            maxLength: 2,
        },
        optionExamples: [[true, OPTION_DECORATOR]],
        type: 'typescript',
        typescriptOnly: true,
    };

    /** @override */
    public applyWithProgram(sourceFile: ts.SourceFile, program: ts.Program): Lint.RuleFailure[] {
        const hasJsDocParameter = this.ruleArguments.indexOf(OPTION_JSDOC_TAG) !== -1;
        const hasDecoratorParameter = this.ruleArguments.indexOf(OPTION_DECORATOR) !== -1;
        return this.applyWithWalker(
            new Walker(sourceFile, this.ruleName, {
                useDecorator: hasDecoratorParameter || !hasJsDocParameter,
                useJsdocTag: hasJsDocParameter || !hasDecoratorParameter
            }, program.getTypeChecker()));
    }
}

const OVERRIDE_KEYWORD = 'override';
const OVERRIDE_DECORATOR_MATCHER = /^@[oO]verride(\(\s*\))?$/;

class Walker extends Lint.AbstractWalker<IOptions> {

    constructor(
            sourceFile: ts.SourceFile,
            ruleName: string,
            private readonly _options: IOptions,
            private readonly checker: ts.TypeChecker) {
        super(sourceFile, ruleName, _options);
    }

    /** @override */
    public walk(sourceFile: ts.SourceFile) {
        const cb = (node: ts.Node): void => {
            if (isSomeClassElement(node)) {
                this.checkClassElement(node);
            }
            return ts.forEachChild(node, cb);
        };

        return ts.forEachChild(sourceFile, cb);
    }

    private checkClassElement(element: AllClassElements) {
        switch (element.kind) {
                case ts.SyntaxKind.Constructor:
                    this.checkConstructorDeclaration(element);
                    break;
                case ts.SyntaxKind.MethodDeclaration:
                case ts.SyntaxKind.PropertyDeclaration:
                case ts.SyntaxKind.GetAccessor:
                case ts.SyntaxKind.SetAccessor:
                    this.checkOverrideableElementDeclaration(element);
                    break;
            default:
                this.checkNonOverrideableElementDeclaration(element);
        }
    }

    private checkNonOverrideableElementDeclaration(node: AllClassElements) {
        const foundKeyword = this.checkNodeForOverrideKeyword(node);
        if (foundKeyword !== undefined) {
            this.addFailureAtNode(foundKeyword, 'Extraneous override keyword',
                    Lint.Replacement.deleteText(foundKeyword.getStart(), foundKeyword.getWidth()));
        }
    }

    private checkConstructorDeclaration(node: ts.ConstructorDeclaration) {
        const foundKeyword = this.checkNodeForOverrideKeyword(node);
        if (foundKeyword !== undefined) {
            this.addFailureAtNode(foundKeyword, 'Extraneous override keyword: constructors always override the parent',
                    Lint.Replacement.deleteText(foundKeyword.getStart(), foundKeyword.getWidth()));
        }
    }

    private checkOverrideableElementDeclaration(node: OverrideableElement) {
        const foundKeyword = this.checkNodeForOverrideKeyword(node);

        if (isStaticMember(node)) {
            if (foundKeyword !== undefined) {
                this.addFailureAtNode(foundKeyword, 'Extraneous override keyword: static members cannot override',
                        Lint.Replacement.deleteText(foundKeyword.getStart(), foundKeyword.getWidth()));
            }
            return;
        }

        const parent = node.parent;
        if (parent == null || !isClassType(parent)) {
            return;
        }
        const base = this.checkHeritageChain(parent, node);

        if (foundKeyword !== undefined && base === undefined) {
            this.addFailureAtNode(node.name, 'Member with @override keyword does not override any base class member',
            Lint.Replacement.deleteText(foundKeyword.getStart(), foundKeyword.getWidth()));
        } else if (foundKeyword === undefined && base !== undefined) {
            const fix = this.fixAddOverrideKeyword(node);
            this.addFailureAtNode(node.name,
                    'Member is overriding a base member. Use the @override keyword if this override is intended',
                    fix,
                );
        }
    }

    private fixAddOverrideKeyword(node: AllClassElements) {
       return (this._options.useJsdocTag) ?
            this.fixWithJSDocTag(node) :
            this.fixWithDecorator(node);
    }

    private fixWithDecorator(node: AllClassElements) {
        return Lint.Replacement.appendText(node.getStart(), '@override ');
    }

    private fixWithJSDocTag(node: AllClassElements) {
        const jsDoc = node.getChildren().filter(ts.isJSDoc);

        if (jsDoc.length > 0) {
            // Append the @override tag to existing jsDoc
            const lastDoc = jsDoc[jsDoc.length - 1];
            const docText = lastDoc.getText();

            const insertPos = this.findPosToInsertJSDocTag(docText);
            const indent = this.findJSDocIndentationAtPos(docText, insertPos);

            const fix = indent + '@override\n';

            return Lint.Replacement.appendText(lastDoc.getStart() + insertPos, fix);
        } else {
            // No Jsdoc found, create a new one with just the tag
            return Lint.Replacement.appendText(node.getStart(), '/** @override */ ');
        }
    }

    private findJSDocIndentationAtPos(text: string, pos: number): string {
        const lastNL = text.substr(0, pos - 1).lastIndexOf('\n');
        if (lastNL < 0) {
            // Cannot find indentation with the info available here
            // Just assume it's 4 spaces...
            return '\n    ';
        }
        let acc = '';
        let hasStar = false;
        for (let i = lastNL + 1 ; i < text.length ; i++) {
            const c = text.charAt(i);
            if (!isJSDocIndent(c)) {
                if (hasStar || c !== '*') {
                    break;
                }
                hasStar = true;
            }
            acc += c;
        }
        return acc;
    }

    private findPosToInsertJSDocTag(text: string): number {
        let posOfInsert = text.lastIndexOf('\n');
        if (posOfInsert >= 0) {
            return posOfInsert + 1;
        }

        posOfInsert = text.lastIndexOf('*/');
        if (posOfInsert >= 0) {
            return posOfInsert;
        }

        // This should not happen, but just to be exhaustive
        return text.length - 1;
    }

    private checkNodeForOverrideKeyword(node: AllClassElements) {
        const matches: OverrideKeyword[] = [];
        if (this._options.useJsdocTag) {
            const jsDoc = node.getChildren().filter(ts.isJSDoc);
            const foundTag = this.checkJSDocAndFindOverrideTag(jsDoc);
            if (foundTag != null) {
                matches.push(foundTag);
            }
        }
        if (this._options.useDecorator) {
            const foundDecorator = this.checkNodeAndFindDecorator(node);
            if (foundDecorator) {
                matches.push(foundDecorator);
            }
        }
        return matches[0];
    }

    private checkNodeAndFindDecorator(node: ts.ClassElement): ts.Decorator | undefined {
        const decorators = node.decorators;
        if (decorators == null) {
            return;
        }
        let found: ts.Decorator | undefined;
        for (const dec of decorators) {
            const tmp = this.checkIndividualDecorator(dec, found !== undefined);
            if (found === undefined) {
                found = tmp;
            }
        }
        return found;
    }

    private checkIndividualDecorator(dec: ts.Decorator, found: boolean) {
        if (!OVERRIDE_DECORATOR_MATCHER.test(dec.getText())) {
            return;
        }
        if (found) {
            this.addFailureAtNode(dec, `@override decorator already specified`,
                    Lint.Replacement.deleteFromTo(dec.pos, dec.end));
        }
        return dec;
    }

    /**
     * Checks the '@override' tags in the JSDoc and returns it if one was found.
     */
    private checkJSDocAndFindOverrideTag(jsDoc: ts.JSDoc[]): ts.JSDocTag | undefined {
        let found: ts.JSDocTag | undefined;
        for (const doc of jsDoc) {
            for (const c of doc.getChildren()) {
                const tmp = this.checkJSDocChild(c, found !== undefined);
                if (found === undefined) {
                    found = tmp;
                }
            }
        }
        return found;
    }

    private checkJSDocChild(child: ts.Node, found: boolean): ts.JSDocTag | undefined {
        if (!isJSDocTag(child) || child.tagName.text !== OVERRIDE_KEYWORD) {
            return;
        }
        if (found) {
            this.addFailureAtNode(child.tagName, `@override jsdoc tag already specified`,
                    Lint.Replacement.deleteFromTo(child.pos, child.end));
        }
        return child;
    }

    private checkHeritageChain(declaration: ts.ClassDeclaration | ts.ClassExpression, node: OverrideableElement)
            : ts.Type | undefined {

        const currentDeclaration = declaration;
        if (currentDeclaration === undefined) {
            return;
        }
        const clauses = currentDeclaration.heritageClauses;
        if (clauses === undefined) {
            return;
        }
        for (const clause of clauses) {
            for (const typeNode of clause.types) {
                const type = this.checker.getTypeAtLocation(typeNode);
                for (const symb of type.getProperties()) {
                    if (symb.name === node.name.getText()) {
                        return type;
                    }
                }
            }
        }
        return undefined;
    }
}

function isStaticMember(node: ts.Node): boolean {
    return (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Static) !== 0;
}

function isJSDocTag(t: ts.Node): t is ts.JSDocTag {
    return t.kind === ts.SyntaxKind.JSDocTag;
}

function isClassType(t: ts.Node | undefined): t is ts.ClassDeclaration | ts.ClassExpression {
    return t !== undefined && (t.kind === ts.SyntaxKind.ClassDeclaration || t.kind === ts.SyntaxKind.ClassExpression);
}

function isJSDocIndent(s: string) {
    return s === ' ' || s === '\t' || s === '\xa0'; // Last one is nbsp
}
