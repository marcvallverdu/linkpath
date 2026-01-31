#!/bin/bash
set -e

MAX_ITERATIONS=${1:-25}
PROGRESS_FILE="progress.txt"
PRD_FILE="prd.json"

echo "🦞 LinkPath Ralph Wiggum Loop — Max $MAX_ITERATIONS iterations"
echo "=================================================="

for i in $(seq 1 $MAX_ITERATIONS); do
    echo ""
    echo "=== Iteration $i of $MAX_ITERATIONS ==="
    echo "$(date '+%Y-%m-%d %H:%M:%S')"
    echo ""

    OUTPUT=$(claude -p \
        --allowedTools "Read,Write,Edit,Bash,WebFetch" \
        "You are building LinkPath (uselinkpath.com) — an AI-powered affiliate link tracking QA platform.

## Your Task

1. Read \`$PRD_FILE\` to find user stories
2. Read \`$PROGRESS_FILE\` for context from previous iterations
3. Read \`CONTEXT.md\` for full product context (tech stack, schema, architecture)
4. Pick the HIGHEST PRIORITY story where \`passes: false\` (lowest priority number first)
5. Implement it fully with proper TypeScript types and tests where applicable
6. Run type checks (\`npx tsc --noEmit\`) and fix any errors
7. Run tests if they exist (\`npm test\`) and fix any failures
8. Update \`$PRD_FILE\`: set \`passes: true\` for the completed story
9. Append your progress to \`$PROGRESS_FILE\` (NEVER overwrite — always append)
10. Make a git commit with message: \`feat(story-XXX): <description>\`

## Rules

- Work on ONE story per iteration. Do not start another.
- Each commit MUST have passing TypeScript types (no errors)
- If you get stuck, document what went wrong in progress.txt and move on
- Use the exact tech stack defined in CONTEXT.md: Next.js 15, Convex, Tailwind v4, shadcn/ui
- For the browser worker (story-008), create it in a /worker subdirectory with its own package.json
- All Convex functions go in /convex directory
- All Next.js pages go in /app directory (App Router)
- Use Server Components by default, Client Components only when needed (interactivity, hooks)

## Completion Check

If ALL stories in the PRD have \`passes: true\`, output exactly:
PROMISE_COMPLETE_HERE

Otherwise, complete the next story and commit.")

    echo "$OUTPUT"

    # Check if all stories are complete
    if echo "$OUTPUT" | grep -q "PROMISE_COMPLETE_HERE"; then
        echo ""
        echo "=================================================="
        echo "🎉 All stories complete! LinkPath MVP is built."
        echo "Total iterations: $i"
        echo "=================================================="
        exit 0
    fi
done

echo ""
echo "=================================================="
echo "⏰ Reached max iterations ($MAX_ITERATIONS). Check progress.txt for status."
echo "=================================================="
