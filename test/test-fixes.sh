#!/bin/sh -xe

FIX_TEST_DIR="./fixes/"

cp "${FIX_TEST_DIR}/spec.bad.ts" "${FIX_TEST_DIR}/spec.bad.tofix.ts"

npm run tslint -- --fix -p "${FIX_TEST_DIR}"

diff "${FIX_TEST_DIR}/spec.fixed.ts" "${FIX_TEST_DIR}/spec.bad.tofix.ts"
