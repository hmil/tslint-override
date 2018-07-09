import '../register';

abstract class ABase {
    constructor() { }
    public static staticBase = 'np';
    public staticChild = 'np';
    public get aGetterToOverride() { return 1; }
    public get aGetterNotToOverride() { return 1; }
    public set aSetterToOverride(value: number) { }
    public set aSetterNotToOverride(value: number) { }
    public aPropertyToOverride = 1;
    public aPropertyNotToOverride = 1;
    public aMethodToOverride(): void { }
    public aMethodNotToOverride(): void { }
}

class Base extends ABase {
    constructor() { super(); }
    public get getterToOverride() { return 1; }
    public get getterNotToOverride() { return 1; }
    public set setterToOverride(value: number) { }
    public set setterNotToOverride(value: number) { }
    public propertyToOverride = 1;
    public propertyNotToOverride = 1;
    public methodToOverride(): void { }
    public methodNotToOverride(): void { }
}

class TagTest extends Base {

    constructor() { super(); }

    @override public get getterToOverride() { return 1; }

    @override public set setterToOverride(value: number) { }

    @override public propertyToOverride = 2;

    @override public aPropertyToOverride = 2;

    @override public methodToOverride(): void {
        if (this.aPropertyToOverride !== 2) {
            throw new Error('Something went wrong')
        }
        console.log("Test OK");
    }
}

const test = new TagTest();
test.methodToOverride();
