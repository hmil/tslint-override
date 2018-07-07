import * as Lint from 'tslint';
import * as ts from 'typescript';

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
            This rule does not take options
        `,
        options: {
        },
        type: 'typescript',
        typescriptOnly: true,
    };

    /** @override */
    public applyWithProgram(sourceFile: ts.SourceFile, program: ts.Program): Lint.RuleFailure[] {
        const args = this.ruleArguments;
        const enableAllChecks = args.length === 0;
        return this.applyWithWalker(
            new Walker(sourceFile, this.ruleName, undefined, program.getTypeChecker()));

        function hasArg(name: string): boolean {
            return args.indexOf(name) !== -1;
        }
    }
}

const OVERRIDE_TAG_RX_MATCHER = /^overr?ides?$/i;
const OVERRIDE_TAG_EXACT_SYNTAX = 'override';

class Walker extends Lint.AbstractWalker<undefined> {
    constructor(
            sourceFile: ts.SourceFile,
            ruleName: string,
            private readonly config: undefined,
            private readonly checker: ts.TypeChecker) {
        super(sourceFile, ruleName, undefined);
    }

    /** @override */
    public walk(sourceFile: ts.SourceFile) {
        const cb = (node: ts.Node): void => {
            if (node.kind === ts.SyntaxKind.MethodDeclaration) {
                this.checkMethodDeclaration(node as ts.MethodDeclaration);
            }
            return ts.forEachChild(node, cb);
        };

        return ts.forEachChild(sourceFile, cb);
    }

    private checkMethodDeclaration(node: ts.MethodDeclaration) {
        const jsDoc = node.getChildren().filter(ts.isJSDoc);
        const foundTag = this.checkJSDocAndFindOverrideTag(jsDoc);

        const type = this.checker.getTypeAtLocation(node);
        const symbol = type.getSymbol();
        if (symbol == null) {
            return;
        }
        const parent = node.parent;
        if (!isClassType(parent)) {
            return undefined;
        }
        const parentType = this.checker.getTypeAtLocation(parent);
        if (!parentType.isClass) {
            return undefined;
        }
        if (foundTag !== undefined) {
            if (!this.checkBaseTypesOverrides(parentType.getBaseTypes(), node)) {
                this.addFailureAtNode(node.name, `Method with @override keyword does not override any base class method`,
                    Lint.Replacement.deleteText(foundTag.getStart(), foundTag.getWidth()));
            }
        } else if (foundTag === undefined) {
            const base = this.checkBaseTypesOverrides(parentType.getBaseTypes(), node);
            if (base !== undefined) {
                const fix = this.fixAddOverrideKeyword(node);
                this.addFailureAtNode(node.name,
                        `Method ${this.prettyPrintMethod(node, parentType)} `
                        + `is overriding ${this.prettyPrintMethod(node, base)}. `
                        + `Use the @override JSDoc tag if the override is intended`,
                        fix,
                    );
            }
        }
    }

    private fixAddOverrideKeyword(node: ts.MethodDeclaration) {
        return Lint.Replacement.appendText(node.getStart(), '/** @override */ ');
    }

    private prettyPrintMethod(methodDecl: ts.MethodDeclaration, klass: ts.Type) {
        return klass.getSymbol()!.name + '#' + methodDecl.name.getText();
    }

    /**
     * Checks the '@override' tags in the JSDoc and returns it if one was found.
     */
    private checkJSDocAndFindOverrideTag(jsDoc: ts.JSDoc[]): ts.JSDocTag | undefined {
        let found: ts.JSDocTag | undefined;
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

    private checkJSDocChild(child: ts.Node, found: boolean): ts.JSDocTag | undefined {
        if (!isJSDocTag(child) || !OVERRIDE_TAG_RX_MATCHER.test(child.tagName.text)) {
            return;
        }
        if (child.tagName.text !== OVERRIDE_TAG_EXACT_SYNTAX) {
            const replacement = Lint.Replacement.replaceFromTo(
                    child.tagName.pos, child.tagName.getEnd(), OVERRIDE_TAG_EXACT_SYNTAX);
            this.addFailureAtNode(child,
                    `Syntax error: '${child.tagName.text}' should be 'override' (case sensitive)`,
                    replacement);
        }
        if (found) {
            this.addFailureAtNode(child.tagName, `@override jsdoc tag already specified`,
                    Lint.Replacement.deleteFromTo(child.pos, child.end));
        }
        return child;
    }

    private checkBaseTypesOverrides(base: ts.BaseType[] | undefined, node: ts.MethodDeclaration)
            : ts.BaseType | undefined {
        if (base === undefined) {
            return undefined;
        }
        for (const type of base) {
            for (const symb of type.getProperties()) {
                if (symb.name === node.name.getText()) {
                    return type;
                }
            }
            const rec = this.checkBaseTypesOverrides(type.getBaseTypes(), node);
            if (rec !== undefined) {
                return rec;
            }
        }
        return undefined;
    }
}

function isJSDocTag(t: ts.Node): t is ts.JSDocTag {
    return t.kind === ts.SyntaxKind.JSDocTag;
}

function isClassType(t: ts.Node | undefined): t is ts.ClassDeclaration | ts.ClassExpression {
    return t !== undefined && (t.kind === ts.SyntaxKind.ClassDeclaration || t.kind === ts.SyntaxKind.ClassExpression);
}
