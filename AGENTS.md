
## Project Overview
This is a personal website/blog for Ronnie Miller, a software developer. The site contains blog posts (called "Field Notes"), project information, a resume, and details about consulting services.

## Tech Stack
- **Jekyll (v3.7.2)**: Static site generator
- **TailwindCSS**: Primary CSS framework with utility classes
- **SASS**: Used for custom styling components
- **PostCSS**: For processing CSS
- **Ruby**: Required for Jekyll (see .ruby-version file)

## Project Structure
- `_layouts/`: Contains page templates
  - `default.html`: Base template for standard pages
  - `home.html`: Home page layout
  - `blog.html`: Blog post layout with title, date, tags
  - `redirect.html`: For redirection purposes
- `_includes/`: Reusable HTML components
  - `header.html`: Site header with navigation
  - `footer.html`: Site footer
  - `hero_header.html`: Hero section for homepage
  - `consulting_cta.html`: Consulting services section
  - `blog_post_links.html`: List of blog posts
- `_sass/`: SASS stylesheets
  - `_resume.scss`: Custom styling for the resume page with print optimizations
  - `_syntax.scss`: Code highlighting styles
  - `_blog.scss`: Blog-specific styles
  - `_font.scss`: Font declarations and typography
- `_posts/`: Blog post content in Markdown
- `css/`: Main CSS files and fonts
  - `screen.scss`: Main stylesheet that imports other SCSS files
- `images/`: Site images and logos
- `resume.md`: Resume page with TailwindCSS and custom styling

## Key Design Elements
- **Color scheme**: Primary colors include sky blue, slate gray, and stone colors
- **Typography**: Blinker font family for headings (with fallbacks)
- **Components**:
  - Hero sections with decorative "wave" caps (`top-cap`, `bottom-cap`)
  - Card-based layout for services
  - Custom text highlighting (`.mark` class)
  - Left-bordered sections for resume entries

## Content Management
- Blog posts are written in Markdown with YAML front matter
- Front matter includes: title, date, tags, layout, subtitle (optional)
- Jekyll handles conversion to HTML and site generation

## Build & Deploy
- `s3_website` gem suggests AWS S3 deployment
- `.github` directory suggests GitHub integration/actions

## Notes for LLMs
1. Always maintain existing structure and naming conventions
2. TailwindCSS classes are heavily used in newer components
3. Some legacy SASS still exists and should be preserved where needed
4. The site uses Jekyll's Liquid templating language for dynamic content
5. Be mindful of responsive design patterns already established
6. When making changes, ensure styling is consistent across all viewport sizes
7. CSS file imports: Remember to check if your SCSS files are properly imported in `screen.scss`
8. The resume page (`resume.md`) combines TailwindCSS with custom SCSS for styling
9. When working with SCSS ensure variable definitions are included at the top of files
10. Print styles are defined for the resume page to ensure proper printing
