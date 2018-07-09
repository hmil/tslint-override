#!/bin/sh -xe

FIX_TEST_DIR="test/fixes"

cp "${FIX_TEST_DIR}/spec.bad.ts" "${FIX_TEST_DIR}/spec.bad.tofix.ts"
npm run tslint -- --fix -p "${FIX_TEST_DIR}"
diff "${FIX_TEST_DIR}/spec.fixed.jsdoc.ts" "${FIX_TEST_DIR}/spec.bad.tofix.ts"

cp "${FIX_TEST_DIR}/spec.bad.ts" "${FIX_TEST_DIR}/spec.bad.tofix.ts"
npm run tslint -- --fix -c ${FIX_TEST_DIR}/tslint.decorator.json -p "${FIX_TEST_DIR}"
diff "${FIX_TEST_DIR}/spec.fixed.decorator.ts" "${FIX_TEST_DIR}/spec.bad.tofix.ts"
