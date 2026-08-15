# TNHTH-blog Site Design Principles

## Positioning

TNHTH-blog is a personal digital space for public, reviewed records of projects, learning, experiments, reading, photography, and thinking. It is not a CV, CMS, or mirror of a private vault.

## Navigation

- 首页 `/`
- 项目 `/projects`
- 笔记 `/notes`
- 关于 `/about`

Topics are a secondary aggregation layer. Writing, Gallery, Photography, Now, and Currently are not primary content systems.

## Visual language

Use a modern research editorial direction:

- warm paper background;
- charcoal text;
- restrained brick-red signal color;
- Chinese-first typography;
- quiet spacing and thin dividers;
- minimal borders and almost no shadow.

Avoid neon, glassmorphism, rainbow tags, heavy shadows, global sidebars, and decorative archive stamps.

```css
--paper: #F5F1E8;
--paper-soft: #ECE8DE;
--ink: #211F1A;
--ink-muted: #5C5952;
--line: #D4CEC1;
--signal: #A84B38;
```

Use Source Han Serif or a legal Chinese serif fallback for ordinary text. Use a mono fallback only for code, paths, commands, and configuration.

## Content rules

- Project pages are results-first: Outcome → Evidence → optional Results → Contributions → Overview → Related Notes.
- Note pages are content-neutral: title, date, and body are the only required fields.
- Optional modules obey `No data → No UI`.
- Do not invent metrics, evidence, relationships, or placeholder media.
- The Galaxy is progressive enhancement; normal HTML links remain the canonical relationship surface.

## Accessibility and responsive behavior

Use semantic HTML, accessible names, visible keyboard focus, `lang="zh-CN"`, useful empty states, stable image dimensions, and `prefers-reduced-motion`. Interactive Galaxy nodes must be keyboard reachable; decorative nodes must be `aria-hidden="true"`.
