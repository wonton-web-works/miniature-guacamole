#!/bin/bash
cd "$(dirname "$0")"
npm test -- --reporter=verbose --coverage 2>&1
