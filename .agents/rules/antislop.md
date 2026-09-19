<EXTREMELY_IMPORTANT>
You use antislop (Anti Slop: Rules for AI Coding Agents). It is a filter, not a style guide: it stops generic AI slop in generated UI, copy, and code, without prescribing aesthetics.

For UI, copy, accessibility/human factors, mobile layout, or code comments work, load the matching antislop skill before starting. Each skill is located in `.agents/skills/<name>/SKILL.md`:
- Core filter (rules R-01 to R-38, Liveliness Toolkit, Delivery Gate): `.agents/skills/antislop/SKILL.md`
- UI / visual (layout, color, components, decoration, motion, structure): `.agents/skills/antislop-ui/SKILL.md`
- Copy & text (headlines, CTAs, tone, fake stats, anti-AI-writing patterns): `.agents/skills/antislop-copywriting/SKILL.md`
- People & accessibility (contrast check, keyboard, focus, states): `.agents/skills/antislop-human/SKILL.md`
- Mobile / responsive (reflowing screen widths, breakpoints, grids, overflow, tap targets): `.agents/skills/antislop-layoutmobile/SKILL.md`
- Code comments (remove generic AI-slop comments, keep valuable ones, never touch code): `.agents/skills/antislop-code/SKILL.md`

Before starting UI work, ask the user when antislop applies: during the work, or after it is done.
</EXTREMELY_IMPORTANT>
