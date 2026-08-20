#!/bin/bash

echo "Starting TraceStory..."

fuser -k 8000/tcp 2>/dev/null
fuser -k 3000/tcp 2>/dev/null

sleep 1

cd "/mnt/c/Users/R Mohith/Mohith/PROJECTS/tracestory"
source venv/bin/activate
uvicorn backend.main:app --reload &

sleep 3

bash -c 'cd "/mnt/c/Users/R Mohith/Mohith/PROJECTS/tracestory/frontend" && npm start' &

echo ""
echo "TraceStory starting... wait 10 seconds then open http://localhost:3000"
