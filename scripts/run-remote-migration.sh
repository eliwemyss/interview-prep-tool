#!/bin/bash

# Run database migration on Railway
echo "Running database migration on Railway..."
railway run --service interview-prep-tool node scripts/migrate.js
