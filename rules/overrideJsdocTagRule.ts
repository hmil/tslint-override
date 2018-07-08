import * as Lint from 'tslint';
import * as ts from 'typescript';

type OverridableElement =
        ts.MethodDeclaration |
        ts.PropertyDeclaration |
        ts.GetAccessorDeclaration |
        ts.SetAccessorDeclaration;

function isOverridableElement(el: ts.Node): el is OverridableElement {
    return  ts.isMethodDeclaration(el) ||
            ts.isPropertyDeclaration(el) ||
            ts.isGetAccessorDeclaration(el) ||
            ts.isSetAccessorDeclaration(el);
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
            if (isOverridableElement(node)) {
                this.checkElementDeclaration(node);
            }
            return ts.forEachChild(node, cb);
        };

        return ts.forEachChild(sourceFile, cb);
    }

    private checkElementDeclaration(node: OverridableElement) {
        const jsDoc = node.getChildren().filter(ts.isJSDoc);
        const foundTag = this.checkJSDocAndFindOverrideTag(jsDoc);

        const parent = node.parent;
        if (parent == null || !isClassType(parent)) {
            return;
        }
        const base = this.checkHeritageChain(parent, node);

        if (foundTag !== undefined && base === undefined) {
            this.addFailureAtNode(node.name, 'Member with @override keyword does not override any base class member',
            Lint.Replacement.deleteText(foundTag.getStart(), foundTag.getWidth()));
        } else if (foundTag === undefined && base !== undefined) {
            const fix = this.fixAddOverrideKeyword(node);
            this.addFailureAtNode(node.name,
                    'Member is overriding a base member. Use the @override JSDoc tag if the override is intended',
                    fix,
                );
        }
    }

    private fixAddOverrideKeyword(node: OverridableElement) {
        return Lint.Replacement.appendText(node.getStart(), '/** @override */ ');
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

    private checkHeritageChain(declaration: ts.ClassDeclaration | ts.ClassExpression, node: OverridableElement)
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

function isJSDocTag(t: ts.Node): t is ts.JSDocTag {
    return t.kind === ts.SyntaxKind.JSDocTag;
}

function isClassType(t: ts.Node | undefined): t is ts.ClassDeclaration | ts.ClassExpression {
    return t !== undefined && (t.kind === ts.SyntaxKind.ClassDeclaration || t.kind === ts.SyntaxKind.ClassExpression);
}
