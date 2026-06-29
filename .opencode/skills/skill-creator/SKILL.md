---
name: skill-creator
description: Create new skills, modify and improve existing skills, and measure skill performance. Use when users want to create a skill from scratch, edit, or optimize an existing skill, run evals to test a skill, benchmark skill performance with variance analysis, or optimize a skill's description for better triggering accuracy.
---

# Skill Creator

A skill for creating new skills and iteratively improving them.

At a high level, the process of creating a skill goes like this:

- Decide what you want the skill to do and roughly how it should do it
- Write a draft of the skill
- Create a few test prompts and run claude-with-access-to-the-skill on them
- Help the user evaluate the results both qualitatively and quantitatively
  - While the runs happen in the background, draft some quantitative evals if there aren't any (if there are some, you can either use as is or modify if you feel something needs to change about them). Then explain them to the user (or if they already existed, explain the ones that already exist)
  - Use the `eval-viewer/generate_review.py` script to show the user the results for them to look at, and also let them look at the quantitative metrics
- Rewrite the skill based on feedback from the user's evaluation of the results (and also if there are any glaring flaws that become apparent from the quantitative benchmarks)
- Repeat until you're satisfied
- Expand the test set and try again at larger scale

Your job when using this skill is to figure out where the user is in this process and then jump in and help them progress through these stages.

The skill creator is liable to be used by people across a wide range of familiarity with coding jargon. Please pay attention to context cues to understand how to phrase your communication.

## Creating a skill

### Capture Intent

Start by understanding the user's intent. The current conversation might already contain a workflow the user wants to capture (e.g., they say "turn this into a skill"). If so, extract answers from the conversation history first — the tools used, the sequence of steps, corrections the user made, input/output formats observed.

1. What should this skill enable Claude to do?
2. When should this skill trigger? (what user phrases/contexts)
3. What's the expected output format?
4. Should we set up test cases to verify the skill works? Skills with objectively verifiable outputs (file transforms, data extraction, code generation, fixed workflow steps) benefit from test cases. Skills with subjective outputs (writing style, art) often don't need them.

### Interview and Research

Proactively ask questions about edge cases, input/output formats, example files, success criteria, and dependencies. Wait to write test prompts until you've got this part ironed out.

### Write the SKILL.md

Based on the user interview, fill in these components:

- **name**: Skill identifier
- **description**: When to trigger, what it does. This is the primary triggering mechanism - include both what the skill does AND specific contexts for when to use it.
- **the rest of the skill**

#### Anatomy of a Skill

```
skill-name/
├── SKILL.md (required)
│   ├── YAML frontmatter (name, description required)
│   └── Markdown instructions
└── Bundled Resources (optional)
    ├── scripts/    - Executable code for deterministic/repetitive tasks
    ├── references/ - Docs loaded into context as needed
    └── assets/     - Files used in output (templates, icons, fonts)
```

#### Progressive Disclosure

Skills use a three-level loading system:
1. **Metadata** (name + description) - Always in context (~100 words)
2. **SKILL.md body** - In context whenever skill triggers (<500 lines ideal)
3. **Bundled resources** - As needed (unlimited, scripts can execute without loading)

#### Writing Patterns

Prefer using the imperative form in instructions. Try to explain to the model why things are important in lieu of heavy-handed MUSTs.

### Test Cases

After writing the skill draft, come up with 2-3 realistic test prompts. Share them with the user, then run them. Save test cases to `evals/evals.json`.

## Running and evaluating test cases

Put results in `<skill-name>-workspace/` as a sibling to the skill directory. Within the workspace, organize results by iteration.

### Step 1: Spawn all runs (with-skill AND baseline) in the same turn

For each test case, spawn two subagents in the same turn — one with the skill, one without.

### Step 2: While runs are in progress, draft assertions

Draft quantitative assertions for each test case and explain them to the user.

### Step 3: As runs complete, capture timing data

When each subagent task completes, save timing data immediately.

### Step 4: Grade, aggregate, and launch the viewer

Once all runs are done, grade each run, aggregate results, and launch the viewer.

### Step 5: Read the feedback

When the user tells you they're done, read `feedback.json` and iterate.

## Improving the skill

1. **Generalize from the feedback.** Create skills usable across many different prompts.
2. **Keep the prompt lean.** Remove things that aren't pulling their weight.
3. **Explain the why.** Try hard to explain the **why** behind everything.
4. **Look for repeated work across test cases.** Bundle reusable scripts.

### The iteration loop

After improving the skill:
1. Apply improvements to the skill
2. Rerun all test cases into a new `iteration-<N+1>/` directory
3. Launch the reviewer with `--previous-workspace`
4. Wait for the user to review
5. Read the new feedback, improve again, repeat

Keep going until the user is satisfied.

## Description Optimization

After creating or improving a skill, offer to optimize the description for better triggering accuracy. This involves generating 20 eval queries, reviewing with the user, and running the optimization loop.

## Reference files

The `agents/` directory contains instructions for specialized subagents. The `references/` directory has additional documentation.

---

Repeating the core loop:
- Figure out what the skill is about
- Draft or edit the skill
- Run claude-with-access-to-the-skill on test prompts
- With the user, evaluate the outputs
- Repeat until you and the user are satisfied
- Package the final skill and return it to the user.
