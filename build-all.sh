#!/bin/bash

set -e

echo "Building API..."
cd apps/api && npm i && npm run build && cd ../../

echo "Building Web..."
cd apps/web && npm i && npm run build && cd ../../

echo "Building Legacy Backend..."
cd stacklens/backend && npm i && npm run build && cd ../../

echo "Building POS Frontend..."
cd pos-demo/frontend && npm i && npm run build && cd ../../

echo "Building POS Backend..."
cd pos-demo/backend && npm i && npm run build && cd ../../

echo "All builds completed!"