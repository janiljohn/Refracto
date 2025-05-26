```markdown
## Prompt for Cursor

Build a modern, single-page marketing site for **Refracto** that echoes the clean, dark style of cursor.sh.  
**Critical:** make **visual/UI changes to the landing page only**—do **not** alter or break any existing functionality, routes, data flow, or backend logic.

### Design brief
- Use `/assets/logo/refracto.svg` as the brand mark; position it beside or above the main hero headline.  
- Background palette: deep navy fading to indigo, with soft violet accents—mirroring Cursor’s gradient hero band and alternating with dark-slate sections.  
- Typography: extra-bold display font for headlines, light sans-serif for body text; generous letter-spacing in section labels.  
- Primary accent colour: **#6366F1** (indigo).  
- Add subtle micro-interactions: fade-in on scroll, button hover lift, and a mild parallax (≈ 5–10 px) on images.  
- **Preserve all current form inputs, buttons, and submission behaviour exactly as they exist.**

### Assets available
The directory `/assets/screenshots` contains four high-resolution PNGs of our current app:  

| File name       | Suggested alt text                                          |
| --------------- | ----------------------------------------------------------- |
| `overall.png`   | “Overall Refracto interface overview”                       |
| `reasoning.png` | “AI reasoning tab showing step-by-step refactor plan”       |
| `create.png`    | “Ticket creation workflow inside Refracto”                  |
| `editor.png`    | “In-app code editor with live refactor preview”             |

### Page structure
1. **Hero** – full-viewport height, centred copy  
   • H1: “Refracto — The AI Code Refactorer”  
   • One-line subhead: “Clean, modernise, and optimise code in seconds.”  
   • Two CTAs: solid indigo “Download for Mac” and ghost “All platforms”.  
   • Logo + headline align left on desktop, centre-stacked on mobile.  

2. **Trusted by** strip – slim dark bar stating “Trusted by engineers at” plus greyscale tech logos that gain opacity on hover.  

3. **Features** – four alternating rows (text left / screenshot right, then flipped) using the screenshots above  
   1. “One-click refactors” — `overall.png`  
   2. “Understands your codebase” — `reasoning.png`  
   3. “Create tasks in natural language” — `create.png`  
   4. “Inline editing with AI hints” — `editor.png`  
   Each row slides up as it enters the viewport.  

4. **Testimonials** – horizontally scrollable cards with avatar, name, company, and short quote; snap scrolling with a subtle shadow-lift on the active card.  

5. **Bottom CTA** – sticky glass-blur bar: “Ready to refactor at lightspeed?” with an indigo button “Get Refracto”.  

6. **Footer** – minimal: logo, copyright, and social icons (monochrome until hover).

### Responsiveness & accessibility
- Mobile-first; breakpoints at 640 px and 1024 px.  
- Ensure at least 4.5 : 1 colour contrast for text.  
- Provide descriptive alt text for all images (use the phrases above).  

### Performance & SEO
- Lazy-load screenshots except `overall.png`, which should be `priority`.  
- Preload the logo SVG.  
- Set meta title “Refracto — The AI Code Refactorer” and an OG image using the logo on a dark-gradient background.  

---

> **Deliverable**: modular React/Next components (Hero, Trusted, Features, Testimonials, CTA) styled with Tailwind that live entirely in the frontend landing-page code. Generate the code directly in the project—do **not** display any code here.  
> **Do not touch backend logic, APIs, or any non-landing-page files, and do not modify or disrupt existing functionalities in any way.**
```