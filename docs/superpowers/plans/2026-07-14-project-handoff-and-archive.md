# Project Handoff and Archive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Leave a maintainable project handoff, preserve superseded plans in a clear archive, and commit the verified result.

**Architecture:** The application remains a GitHub Pages PWA that calls an Aliyun Function Compute proxy, which calls Bailian. The handoff documents make the runtime boundary, secret boundary, deployment paths, and the CORS ownership rule explicit; original planning files are retained unchanged under a repository archive.

**Tech Stack:** React 19, Vite, vite-plugin-pwa, Vitest, GitHub Pages, GitHub Actions, Aliyun Function Compute, Alibaba Cloud Bailian.

## Global Constraints

- Keep `BAILIAN_API_KEY` exclusively in Function Compute environment variables; never place it in the repository, GitHub variables, or browser code.
- CORS response headers are owned by the Function Compute gateway; `server/index.mjs` must not emit `Access-Control-*` headers.
- Archive only the three clearly superseded `AI成长空间-*.md` planning files; leave `family`, `presentation`, and `spirituality` untouched.
- Add `.DS_Store` to the repository ignore rules and remove existing local Finder metadata.
- Commit the related changes on `main` with `byGPT5.6` in the commit message, then push `origin/main`.

---

### Task 1: Write the current-project handoff

**Files:**
- Create: `README.md`
- Create: `docs/PROJECT_HANDOFF.md`
- Modify: `DEPLOY_ALIYUN.md`

**Interfaces:**
- Consumes: the deployed GitHub Pages URL, the Function Compute function name, current environment-variable names, and the verified CORS diagnosis.
- Produces: a user-facing entry point and a maintainer handoff that point to the same deployment and security rules.

- [x] **Step 1: Add a concise repository entry point**

Write `README.md` with the live PWA URL `https://miley.github.io/ai-personal-growth/`, the three product areas (private companion, expression practice, English reading), iPhone installation steps, and links to the two maintenance documents.

- [x] **Step 2: Add the maintainer handoff**

Write `docs/PROJECT_HANDOFF.md` with the architecture flow `GitHub Pages PWA -> Function Compute -> Bailian`, storage and privacy boundaries, feature priorities, cloud resource identifiers, frontend/function deployment paths, the CORS incident and rule, troubleshooting, verification commands, and scope/security constraints.

- [x] **Step 3: Correct the deployment guide's CORS ownership**

Replace the statement that function code handles CORS with the verified rule: enable CORS in the Function Compute HTTP trigger for `POST` and `OPTIONS`, and return JSON only from `server/index.mjs` so browser CORS headers are not duplicated.

- [x] **Step 4: Verify documentation coverage**

Run: `rg -n "GitHub Pages|Function Compute|BAILIAN_API_KEY|CORS|load failed" README.md DEPLOY_ALIYUN.md docs/PROJECT_HANDOFF.md`

Expected: each operational topic appears in at least one of the three documents, and the API key appears only as an environment-variable name.

### Task 2: Archive superseded planning files and local metadata

**Files:**
- Create: `docs/archive/legacy-plans/README.md`
- Move: `../AI成长空间-方案与实施计划.md` to `docs/archive/legacy-plans/AI成长空间-方案与实施计划.md`
- Move: `../AI成长空间-轻量化部署实施计划.md` to `docs/archive/legacy-plans/AI成长空间-轻量化部署实施计划.md`
- Move: `../AI成长空间-轻量化部署设计.md` to `docs/archive/legacy-plans/AI成长空间-轻量化部署设计.md`
- Modify: `.gitignore`
- Remove: `.DS_Store`
- Remove: `../.DS_Store`

**Interfaces:**
- Consumes: the original markdown files from the parent `personal-growth` directory.
- Produces: an in-repository archive with a readme identifying its replacements, and no local Finder metadata in the tracked work area.

- [x] **Step 1: Write the archive index**

Write `docs/archive/legacy-plans/README.md` naming all three archived files, stating that they are preserved as historical planning context, and linking to `../../PROJECT_HANDOFF.md` and `../../../DEPLOY_ALIYUN.md` as current sources.

- [x] **Step 2: Move only the identified legacy files**

Run:

```bash
mv ../AI成长空间-方案与实施计划.md docs/archive/legacy-plans/
mv ../AI成长空间-轻量化部署实施计划.md docs/archive/legacy-plans/
mv ../AI成长空间-轻量化部署设计.md docs/archive/legacy-plans/
```

Expected: the three original files no longer sit beside unrelated `family`, `presentation`, and `spirituality` folders; their contents exist unchanged in the archive.

- [x] **Step 3: Keep Finder metadata out of source control**

Append `.DS_Store` to `.gitignore`, then remove the repository and parent-directory `.DS_Store` files.

- [x] **Step 4: Verify the archive boundary**

Run: `find .. -maxdepth 1 -type f -name 'AI成长空间-*.md' -print && find docs/archive/legacy-plans -maxdepth 1 -type f -print`

Expected: the first command has no output; the second lists the archive index and exactly three legacy markdown files.

### Task 3: Validate and publish the documentation update

**Files:**
- Verify: `server/index.test.ts`
- Verify: generated `dist/`
- Commit: repository documentation, archive, deployment guide, and `.gitignore`

**Interfaces:**
- Consumes: Tasks 1 and 2 and the existing React/function test suite.
- Produces: a clean, pushed `main` commit with an auditable validation result.

- [x] **Step 1: Run application verification**

Run: `npm test -- --run && npm run build`

Expected: all Vitest tests pass, including the CORS regression test, and Vite writes a production build without errors.

- [x] **Step 2: Check the diff and secret boundary**

Run:

```bash
git diff --check
git status --short
git grep -n -E 'sk-[A-Za-z0-9_.-]{20,}' || true
```

Expected: no whitespace errors, only the intended documentation/archive/ignore changes, and no API-key-shaped value in tracked files.

- [x] **Step 3: Commit and push**

Run:

```bash
git add README.md DEPLOY_ALIYUN.md .gitignore docs
git commit -m "docs: add project handoff and archive legacy plans byGPT5.6"
git push origin main
```

Expected: `main` is pushed and the commit subject contains `byGPT5.6`.
