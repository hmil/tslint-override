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
const OPTION_EXCLUDE_INTERFACES = 'exclude-interfaces';
const OPTION_FIX_PASCAL_CASE = 'pascal-case-fixer';
const OPTION_NEW_LINE_AFTER_DECORATORS_AND_TAGS = 'new-line-after-decorators-and-tags';
const OPTION_ANGULAR_SYNTAX = 'angular-syntax';

const MESSAGE_EXTRA_CONSTRUCTOR = 'Extraneous override keyword: constructors always override the parent';
const MESSAGE_EXTRA_STATIC = 'Extraneous override keyword: static members cannot override';
const MESSAGE_EXTRA_NO_OVERRIDE = 'Member with @override keyword does not override any base class member';
const MESSAGE_MISSING_OVERRIDE = 'Member is overriding a base member. Use the @override keyword if this override is intended';
const MESSAGE_EXTRA = 'Extraneous override keyword';

interface IOptions {
    useJsdocTag: boolean;
    useDecorator: boolean;
    excludeInterfaces: boolean;
    usePascalCase: boolean;
    newLineAfter: boolean;
    useAngularSyntax: boolean;
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
            * \`"${OPTION_EXCLUDE_INTERFACES}"\` Exclude interfaces from member override checks (default: false)
            * \`"${OPTION_FIX_PASCAL_CASE}"\` Uses PascalCase \`@Override\` for the jsdoc tag or decorator in the fixer (default: false)
            * \`"${OPTION_NEW_LINE_AFTER_DECORATORS_AND_TAGS}"\` ` +
                    `Breaks the line after the jsdoc tag or decorator in the fixer (default: false)
            * \`"${OPTION_ANGULAR_SYNTAX}"\` Uses Angular Syntax (aka Legacy Decorator Proposal) where the decorator is a function
        `,
        options: {
            type: 'array',
            items: {
                type: 'string',
                enum: [
                    OPTION_DECORATOR,
                    OPTION_JSDOC_TAG,
                    OPTION_EXCLUDE_INTERFACES,
                    OPTION_FIX_PASCAL_CASE,
                    OPTION_NEW_LINE_AFTER_DECORATORS_AND_TAGS,
                    OPTION_ANGULAR_SYNTAX
                ],
            },
            minLength: 1,
            maxLength: 5,
        },
        optionExamples: [[true, OPTION_DECORATOR]],
        type: 'typescript',
        typescriptOnly: true,
    };

    /** @override */
    public applyWithProgram(sourceFile: ts.SourceFile, program: ts.Program): Lint.RuleFailure[] {
        const hasJsDocParameter = this.ruleArguments.indexOf(OPTION_JSDOC_TAG) !== -1;
        const hasDecoratorParameter = this.ruleArguments.indexOf(OPTION_DECORATOR) !== -1;
        const hasExcludeInterfacesParameter = this.ruleArguments.indexOf(OPTION_EXCLUDE_INTERFACES) !== -1;
        const hasPascalCaseParameter = this.ruleArguments.indexOf(OPTION_FIX_PASCAL_CASE) !== -1;
        const hasNewLineAfterParameter = this.ruleArguments.indexOf(OPTION_NEW_LINE_AFTER_DECORATORS_AND_TAGS) !== -1;
        const hasAngularSyntaxParameter = this.ruleArguments.indexOf(OPTION_ANGULAR_SYNTAX) !== -1;

        return this.applyWithWalker(
            new Walker(sourceFile, this.ruleName, {
                useDecorator: hasDecoratorParameter || !hasJsDocParameter,
                useJsdocTag: hasJsDocParameter || !hasDecoratorParameter,
                excludeInterfaces: hasExcludeInterfacesParameter,
                usePascalCase: hasPascalCaseParameter,
                newLineAfter: hasNewLineAfterParameter,
                useAngularSyntax: hasAngularSyntaxParameter
            }, program.getTypeChecker()));
    }
}

const OVERRIDE_KEYWORD_CAMEL = 'override';
const OVERRIDE_KEYWORD_PASCAL = 'Override';
const OVERRIDE_DECORATOR_MATCHER = /^@[oO]verride(\(\s*\))?$/;

type HeritageChainCheckResult = {
    baseClass?: ts.Type;
    baseInterface?: ts.Type;
} | undefined;

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
            this.addFailureAtNode(foundKeyword, MESSAGE_EXTRA, fixRemoveOverrideKeyword(foundKeyword));
        }
    }

    private checkConstructorDeclaration(node: ts.ConstructorDeclaration) {
        const foundKeyword = this.checkNodeForOverrideKeyword(node);
        if (foundKeyword !== undefined) {
            this.addFailureAtNode(foundKeyword, MESSAGE_EXTRA_CONSTRUCTOR, fixRemoveOverrideKeyword(foundKeyword));
        }
    }

    private checkOverrideableElementDeclaration(node: OverrideableElement) {
        const foundKeyword = this.checkNodeForOverrideKeyword(node);

        if (isStaticMember(node)) {
            if (foundKeyword !== undefined) {
                this.addFailureAtNode(foundKeyword, MESSAGE_EXTRA_STATIC, fixRemoveOverrideKeyword(foundKeyword));
            }
            return;
        }

        if (!ts.isPropertyDeclaration(node) && node.body === undefined) {
            // Special case if this is just an overload signature
            return;
        }

        const parent = node.parent;
        if (parent == null || !isClassType(parent)) {
            return;
        }

        if (ts.isClassExpression(parent) && !this._options.useJsdocTag) {
            // decorators are not allowed in anonymous class declarations.
            // Skip anonymous class declarations if JSDoc tags are not an option.
            return;
        }

        const base = this.checkHeritageChain(parent, node);

        if (
            // This member declares @override
            foundKeyword !== undefined &&
            // But no base symbol was found
            (base === undefined || base.baseClass === undefined && base.baseInterface === undefined)
        ) {
            // TODO: When given two @override decorators following each other (with a new line or a whitespace between them),
            // the fixer does not break the line
            this.addFailureAtNode(node.name, MESSAGE_EXTRA_NO_OVERRIDE, fixRemoveOverrideKeyword(foundKeyword));
        } else if (
            // This member does not declare @override
            foundKeyword === undefined &&
            // And something was found
            base !== undefined &&
            // And that thing is either a base class, or an interface and we are not excluding interface
            (base.baseClass !== undefined || base.baseInterface !== undefined && !this._options.excludeInterfaces)
        ) {
            this.addFailureAtNode(node.name, MESSAGE_MISSING_OVERRIDE, this.fixAddOverrideKeyword(node));
        }
    }

    private fixAddOverrideKeyword(node: AllClassElements) {
        return (this._options.useJsdocTag) ?
                this.fixWithJSDocTag(node) :
                this.fixWithDecorator(node);
    }

    private fixWithDecorator(node: AllClassElements) {
        if (this._options.newLineAfter) {
            const indent = this.findIndentationOfNode(node);
            return Lint.Replacement.appendText(node.getStart(), `@${this.getKeyword()}\n` + indent); // tslint:disable-line
        }
        return Lint.Replacement.appendText(node.getStart(), `@${this.getKeyword()} `);
    }

    private fixWithJSDocTag(node: AllClassElements) {
        const jsDoc = node.getChildren().filter(ts.isJSDoc);

        if (jsDoc.length > 0) {
            // Append the @override tag to existing jsDoc
            const lastDoc = jsDoc[jsDoc.length - 1];
            const docText = lastDoc.getText();

            const insertPos = this.findPosToInsertJSDocTag(docText);
            const indent = this.findJSDocIndentationAtPos(docText, insertPos);

            const fix = indent + `@${this.getKeyword()}\n`;

            return Lint.Replacement.appendText(lastDoc.getStart() + insertPos, fix);
        } else {
            // No Jsdoc found, create a new one with just the tag
            if (this._options.newLineAfter) {
                const indent = this.findIndentationOfNode(node);
                return Lint.Replacement.appendText(node.getStart(), `/** @${this.getKeyword()} */\n` + indent);
            }
            return Lint.Replacement.appendText(node.getStart(), `/** @${this.getKeyword()} */ `);
        }
    }

    private findIndentationOfNode(node: AllClassElements): string {
        let text = node.getFullText();
        const tokenStart = text.indexOf(node.getText());
        text = text.substr(0, tokenStart);
        const lastNL = text.lastIndexOf('\n');
        return text.substr(lastNL + 1);
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
        if (!isJSDocTag(child) || child.tagName.text !== OVERRIDE_KEYWORD_CAMEL && child.tagName.text !== OVERRIDE_KEYWORD_PASCAL) {
            return;
        }
        if (found) {
            this.addFailureAtNode(child.tagName, `@override jsdoc tag already specified`,
                    Lint.Replacement.deleteFromTo(child.pos, child.end));
        }
        return child;
    }

    private checkHeritageChain(declaration: ts.ClassDeclaration | ts.ClassExpression, node: OverrideableElement)
            : HeritageChainCheckResult {

        let baseInterface: ts.Type | undefined;
        let baseClass: ts.Type | undefined;

        const currentDeclaration = declaration;
        if (currentDeclaration === undefined) {
            return;
        }
        const clauses = currentDeclaration.heritageClauses;
        if (clauses === undefined) {
            return;
        }
        for (const clause of clauses) {
            const isInterface = clause.token === ts.SyntaxKind.ImplementsKeyword;
            for (const typeNode of clause.types) {
                const type = this.checker.getTypeAtLocation(typeNode);
                for (const symb of type.getProperties()) {
                    if (symb.name === node.name.getText()) {
                        if (isInterface) {
                            baseInterface = type;
                        } else {
                            baseClass = type;
                        }
                    }
                }
            }
        }
        return { baseInterface, baseClass };
    }

    private getKeyword() {
        const keyword = this._options.usePascalCase ? OVERRIDE_KEYWORD_PASCAL : OVERRIDE_KEYWORD_CAMEL;
        return this._options.useAngularSyntax ? `${keyword}()` : `${keyword}`;
    }
}

function fixRemoveOverrideKeyword(keyword: OverrideKeyword) {
    return Lint.Replacement.deleteText(keyword.getStart(), keyword.getWidth());
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
