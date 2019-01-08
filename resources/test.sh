#!/bin/sh -xe

# Test the lint rule

tslint --test test
node_modules/.bin/ts-node -P test/tsconfig.json test/test.ts
tslint -p test test/test.ts
tslint -p test/exclude-interfaces

# Test the fixers

FIX_TEST_DIR="test/fixers"

cp "${FIX_TEST_DIR}/spec.bad.ts" "${FIX_TEST_DIR}/spec.bad.tofix.ts" # Make a copy to keep the original untouched
npm run tslint -- --fix -p "${FIX_TEST_DIR}" # Fix
diff "${FIX_TEST_DIR}/spec.fixed.jsdoc.ts" "${FIX_TEST_DIR}/spec.bad.tofix.ts" # Check the result against the reference
node_modules/.bin/ts-node -P "${FIX_TEST_DIR}/tsconfig.json" "${FIX_TEST_DIR}/spec.bad.tofix.ts" # Check that the result is valid for tsc

# Repeat for the decorator-based fixer
cp "${FIX_TEST_DIR}/spec.bad.ts" "${FIX_TEST_DIR}/spec.bad.tofix.ts"
npm run tslint -- --fix -c ${FIX_TEST_DIR}/tslint.decorator.json -p "${FIX_TEST_DIR}"
diff "${FIX_TEST_DIR}/spec.fixed.decorator.ts" "${FIX_TEST_DIR}/spec.bad.tofix.ts"
node_modules/.bin/ts-node -P "${FIX_TEST_DIR}/tsconfig.json" "${FIX_TEST_DIR}/spec.bad.tofix.ts"

# Repeat for the pascal-case fixer
cp "${FIX_TEST_DIR}/spec.bad.ts" "${FIX_TEST_DIR}/spec.bad.tofix.ts"
npm run tslint -- --fix -c ${FIX_TEST_DIR}/tslint.pascal.json -p "${FIX_TEST_DIR}"
diff "${FIX_TEST_DIR}/spec.fixed.pascal.ts" "${FIX_TEST_DIR}/spec.bad.tofix.ts"
node_modules/.bin/ts-node -P "${FIX_TEST_DIR}/tsconfig.json" "${FIX_TEST_DIR}/spec.bad.tofix.ts"

# Repeat for the break-line-after fixer in jsdoc settings
cp "${FIX_TEST_DIR}/spec.bad.ts" "${FIX_TEST_DIR}/spec.bad.tofix.ts"
npm run tslint -- --fix -c ${FIX_TEST_DIR}/tslint.breakLineJsdoc.json -p "${FIX_TEST_DIR}"
diff "${FIX_TEST_DIR}/spec.fixed.breakLineJsdoc.ts" "${FIX_TEST_DIR}/spec.bad.tofix.ts"
node_modules/.bin/ts-node -P "${FIX_TEST_DIR}/tsconfig.json" "${FIX_TEST_DIR}/spec.bad.tofix.ts"

# Repeat for the break-line-after fixer in decorator settings
cp "${FIX_TEST_DIR}/spec.bad.ts" "${FIX_TEST_DIR}/spec.bad.tofix.ts"
npm run tslint -- --fix -c ${FIX_TEST_DIR}/tslint.breakLineDecorator.json -p "${FIX_TEST_DIR}"
diff "${FIX_TEST_DIR}/spec.fixed.breakLineDecorator.ts" "${FIX_TEST_DIR}/spec.bad.tofix.ts"
node_modules/.bin/ts-node -P "${FIX_TEST_DIR}/tsconfig.json" "${FIX_TEST_DIR}/spec.bad.tofix.ts"
