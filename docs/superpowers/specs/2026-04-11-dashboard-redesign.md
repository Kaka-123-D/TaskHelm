# TaskHelm Dashboard Redesign — Design Spec

## Goal

Redesign the TaskHelm web dashboard with a Soft Glass visual identity, Motion animations, and a simplified feature set focused on project/task management, workspace control, dev servers, and SpecDown integration. Remove agent orchestration, notifications, and review pipeline — AI handles those via skills.

## Architecture: Incremental Reskin (Approach B)

Keep existing API routes and data layer. Rewrite all UI components, layout, and pages with new design system. Remove unused features. Add Motion animations and SpecDown integration.

## Tech Stack

- Next.js 15, React 19, TypeScript
- Tailwind CSS 4 (design tokens via CSS variables)
- Motion (framer-motion v11+) for animations
- SQLite (better-sqlite3) via existing `@taskhelm/core`
- Existing `@taskhelm/supervisor` for dev server/worktree ops

---

## 1. Design System — Soft Glass

### Color Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-base` | `#0c0a1a` | Page background start |
| `--bg-deep` | `#1a1333` | Page background end |
| `--surface` | `rgba(255,255,255,0.04)` | Card/panel backgrounds |
| `--surface-hover` | `rgba(255,255,255,0.07)` | Hover state |
| `--border` | `rgba(255,255,255,0.06)` | Default borders |
| `--border-hover` | `rgba(255,255,255,0.12)` | Hover borders |
| `--primary` | `#818cf8` | Primary actions, links |
| `--primary-hover` | `#a5b4fc` | Primary hover |
| `--primary-glow` | `rgba(129,140,248,0.4)` | Glow effect |
| `--text-primary` | `#e2e0ff` | Headings, important text |
| `--text-secondary` | `#8b85b0` | Body text |
| `--text-muted` | `#6b6194` | Labels, hints |
| `--status-running` | `#818cf8` | Running status |
| `--status-done` | `#34d399` | Done status |
| `--status-ready` | `#f59e0b` | Ready status |
| `--status-draft` | `#4b5563` | Draft status |
| `--status-blocked` | `#ef4444` | Blocked status |
| `--danger` | `#ef4444` | Destructive actions |
| `--danger-hover` | `#fca5a5` | Danger hover |

### Glass Effect

```css
.glass {
  background: var(--surface);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  border-radius: 12px;
}
```

### Typography

- Font: system-ui stack (`system-ui, -apple-system, sans-serif`)
- Monospace: `ui-monospace, 'SF Mono', monospace` for ports, PIDs, paths
- Weights: 400 (body), 600 (subheadings), 700 (headings)
- Sizes: 12px labels, 14px body, 16px subheadings, 20px+ headings

### Base Components

| Component | Description |
|-----------|-------------|
| `GlassCard` | Container with glass effect, hover glow |
| `GlassSidebar` | 220px expanded sidebar with nav + recent projects |
| `GlassButton` | Variants: primary (filled), secondary (outline), ghost, danger |
| `GlassInput` | Text input with glass background |
| `GlassSelect` | Select dropdown with glass styling |
| `GlassModal` | Overlay modal with backdrop blur |
| `StatusBadge` | Pill with status color + optional glow |
| `StatusDot` | Small circle with status color + glow for running |
| `FilterPills` | Horizontal group of clickable pills |
| `Breadcrumb` | Navigation path with clickable segments |
| `PortBadge` | Monospace port display with indigo background |

---

## 2. Layout

```
┌──────────────────────────────────────────────────┐
│ GlassSidebar (220px)  │  Content Area (flex: 1)  │
│                       │                          │
│ Logo: TaskHelm        │  <Breadcrumb />          │
│                       │  <PageHeader />          │
│ Nav:                  │  <PageContent />         │
│   Projects (active)   │                          │
│   Dev Servers         │                          │
│                       │                          │
│ Recent:               │                          │
│   My App              │                          │
│   Another Project     │                          │
│                       │                          │
│ (bottom) Settings     │                          │
└──────────────────────────────────────────────────┘
```

- Sidebar: always expanded, 220px, glass background
- Nav items: icon + label, active state with primary background
- Recent projects: auto-populated from DB, clickable shortcuts
- Content area: full height, scrollable, padded

---

## 3. Pages

### 3.1 Project List (`/`)

- Header: "Projects" title + project count + "+ New Project" button
- Body: responsive grid of `GlassCard` (1-3 columns)
- Each card shows:
  - Project name (bold)
  - Repo path (monospace, truncated)
  - Task count badge
  - Running server count with green dot (if any)
- Click card → `/projects/[slug]`
- "+ New Project" → `GlassModal` with:
  - FolderPicker (browse local filesystem for repo root)
  - Auto-fill name + slug from folder name
  - Max dev servers input (default 3)
  - SpecDown project link (optional, configure later)

### 3.2 Project Detail (`/projects/[slug]`)

- Breadcrumb: Projects → [Project Name]
- Header: project name, repo path, edit (pencil icon) / delete (trash icon) buttons
- Filter pills: All | Draft | Ready | Running | Done | Blocked
- Task list: vertical rows, each row:
  - `StatusDot` (color by status, glow if running)
  - Task title (clickable)
  - `StatusBadge` (text label)
  - `PortBadge` (if dev server running)
  - Priority indicator (optional subtle color)
- Empty state: illustration + "Create your first task" CTA
- "+ New Task" button → `GlassModal` with:
  - Title (required)
  - Priority select (low/medium/high/critical)
  - Source type + source ref (optional)

### 3.3 Task Detail (`/projects/[slug]/tasks/[taskId]`)

- Breadcrumb: Projects → [Project] → [Task Title]
- Header row:
  - Task title (editable inline or via edit button)
  - `StatusBadge` with dropdown to change status
  - `PortBadge` (if running)
  - Edit / Delete buttons

- **Split panel layout:**

  **Left panel (flex: 1) — Context Files:**
  - Section header: "Context Files"
  - List of markdown files from task capsule directory:
    - `context.md` — scope, assumptions, code pointers
    - `plan.md` — implementation plan
    - `handoff.md` — current status, blockers
    - `review.md` — review findings (if exists)
  - Each file row: file icon + name + "Open in SpecDown →" link
  - Click file → show markdown preview below the list (read-only rendered markdown)
  - If SpecDown not configured: "Open in SpecDown →" links are hidden, show "Link SpecDown" prompt

  **Right panel (280px) — Workspace & Dev Server:**
  
  *Workspace section:*
  - Branch name (monospace)
  - Worktree path (monospace, truncated)
  - If no workspace: "Init Workspace" button (creates branch + worktree + copies .env)
  - If workspace exists: "Cleanup" button (removes worktree + branch)
  
  *Dev Server section:*
  - Status indicator: `StatusDot` + status text
  - Port input: `GlassInput` (type number, user chooses port)
  - Port validation: check availability before start
  - If not running: "Start" button
  - If running: "Stop" button + "Open ↗" link (opens localhost:port in browser)
  - Display PID when running

### 3.4 Dev Server Pool (`/dev-pool`)

- Header: "Dev Server Pool" + server count
- Table with glass-styled rows:
  - Project (link to project)
  - Task (link to task)
  - Port (monospace)
  - PID (monospace)
  - Status (`StatusBadge`)
  - Started at (timestamp)
- Empty state: "No dev servers running"

---

## 4. Animations (Motion)

All animations use Motion (framer-motion v11+).

### Page Transitions
```tsx
<AnimatePresence mode="wait">
  <motion.div
    key={pathname}
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    transition={{ duration: 0.2 }}
  />
</AnimatePresence>
```

### List Items (staggered entrance)
```tsx
// Parent
<motion.div variants={{ show: { transition: { staggerChildren: 0.05 } } }}>
// Child
<motion.div
  initial={{ opacity: 0, y: 12 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, x: -20, height: 0 }}
/>
```

### Cards (hover lift)
```tsx
<motion.div
  whileHover={{ scale: 1.02, y: -2 }}
  transition={{ type: "spring", stiffness: 400, damping: 25 }}
/>
```

### Modals
```tsx
// Backdrop: opacity 0 → 1
// Modal: y: 20, opacity: 0 → y: 0, opacity: 1 (spring)
```

### Buttons
```tsx
<motion.button whileTap={{ scale: 0.97 }} />
```

### Sidebar Active Indicator
```tsx
// layoutId="sidebar-active" on the active nav item background
// Animates position smoothly between nav items
```

### Filter Pills
```tsx
// layoutId="active-filter" on the active pill background
// Slides between pills on click
```

### Status Changes
- Color transitions via CSS `transition: color 0.3s, background 0.3s`

### Delete Animation
```tsx
exit={{ opacity: 0, height: 0, x: -20, transition: { duration: 0.2 } }}
```

---

## 5. SpecDown Integration

### Connection
- SpecDown URL pattern: `/{username}/{project-slug}?docId={documentUUID}`
- Configuration stored per project (in SQLite `projects` table or project settings)
- Fields: `specdown_username`, `specdown_project_slug`

### Behavior
- Task detail page reads markdown files from disk (task capsule directory)
- Files displayed in a list with preview on click
- "Open in SpecDown →" link opens the SpecDown project page: `/{username}/{slug}`
- If a specific document mapping exists (docId stored per file), link includes `?docId={uuid}`
- If SpecDown not configured for project: links hidden, show subtle prompt to configure
- SpecDown is view-only in TaskHelm — all editing happens in the SpecDown web app

### Context File Reading
- API route reads files from `projects/<project-slug>/tasks/<task-id>/` directory
- Returns list of `.md` files with their content
- Frontend renders markdown content in a styled preview panel

---

## 6. Worktree & Dev Server

### Worktree Init
1. Create git branch `task/<task-id>`
2. Create git worktree at configured path
3. Copy `.env` from repo root to worktree root
4. Update task record with branch + worktree path

### Worktree Cleanup
1. Remove git worktree
2. Delete branch (if not merged)
3. Clear worktree path from task record

### Dev Server
1. User enters desired port number
2. System validates port is available (not in use by another task, not occupied by OS)
3. Start dev server in worktree directory with specified port
4. Track PID, port, status in SQLite
5. Stop: kill process, update status
6. Max concurrent servers enforced per project setting

### Port Validation
- Check against `dev_servers` table for TaskHelm-managed ports
- Check OS port availability via `net.createServer` probe
- Return error if port unavailable with suggestion

---

## 7. Features Removed

| Feature | Reason |
|---------|--------|
| Agent dispatch UI | AI handles via skills |
| Notification system | Not needed without agent orchestration |
| Review pipeline UI | AI handles via skills |
| Supervisor daemon | Not needed — simple process management only |
| Agent runs section | Removed from task detail |
| `/api/tasks/[taskId]/agent` route | No agent dispatch |

---

## 8. File Structure (new/modified)

```
packages/web/src/
  app/
    layout.tsx                          # Modified: new GlassSidebar layout
    page.tsx                            # Modified: project list with GlassCards
    projects/[slug]/
      page.tsx                          # Modified: task list view
      tasks/[taskId]/
        page.tsx                        # Modified: split panel task detail
    dev-pool/
      page.tsx                          # Modified: glass-styled table
    api/
      tasks/[taskId]/
        context-files/route.ts          # NEW: read markdown files
      specdown/config/route.ts          # NEW: SpecDown settings
      # Keep all other existing API routes
  components/
    design-system/
      glass-card.tsx                    # NEW
      glass-button.tsx                  # NEW
      glass-input.tsx                   # NEW
      glass-select.tsx                  # NEW
      glass-modal.tsx                   # NEW
      glass-sidebar.tsx                 # NEW
      status-badge.tsx                  # NEW (replaces old)
      status-dot.tsx                    # NEW
      filter-pills.tsx                  # NEW
      breadcrumb.tsx                    # NEW
      port-badge.tsx                    # NEW
    project-card.tsx                    # NEW
    project-list.tsx                    # NEW
    task-row.tsx                        # NEW
    task-list.tsx                       # NEW
    task-detail-panels.tsx              # NEW
    context-file-list.tsx              # NEW
    context-file-preview.tsx           # NEW
    workspace-panel.tsx                 # NEW (replaces workspace-controls)
    dev-server-panel.tsx               # NEW (replaces dev-server-controls)
    create-project-form.tsx            # Modified: glass styling
    create-task-form.tsx               # Modified: glass styling
    edit-project-form.tsx              # Modified: glass styling
    edit-task-form.tsx                 # Modified: glass styling
    delete-confirm.tsx                 # Modified: glass styling
    folder-picker.tsx                  # Modified: glass styling
    page-transition.tsx                # NEW: AnimatePresence wrapper
  styles/
    glass-tokens.css                   # NEW: CSS custom properties
  # REMOVE:
  #   dispatch-agent-form.tsx
  #   task-cockpit.tsx (replaced by task-detail-panels)
```

---

## 9. Data Flow

```
User Action → React Component → API Route → Core/Supervisor → SQLite/Filesystem
                                    ↓
                              Response JSON
                                    ↓
                            React State Update → Motion Animation → UI
```

- All mutations go through API routes (Next.js route handlers)
- API routes use `@taskhelm/core` repositories for CRUD
- API routes use `@taskhelm/supervisor` for worktree/dev-server ops
- Pages are server components where possible, client components for interactivity
- Motion wraps interactive elements for animation

---

## 10. Non-Goals (explicitly excluded)

- Real-time WebSocket updates (polling or page refresh is fine for v1)
- Dark/light theme toggle (dark only)
- Mobile responsive (desktop-first, reasonable tablet support)
- Drag-and-drop task reordering
- Keyboard shortcuts
- Search/command palette
