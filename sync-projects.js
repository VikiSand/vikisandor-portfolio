#!/usr/bin/env node
/**
 * sync-projects.js
 * Reads all .md files from the content/ folder and regenerates projects-data.js
 *
 * Usage:  node sync-projects.js
 *
 * Each .md file becomes one project entry. See content/_template.md for format.
 */

const fs   = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(__dirname, 'content');
const OUTPUT      = path.join(__dirname, 'projects-data.js');

// ── Parser ────────────────────────────────────────────────────────────────────
function parseProjectFile(content, filename) {
    const lines = content.split(/\r?\n/);

    const project = {
        id:          slugify(path.basename(filename, '.md')),
        title:       '',
        category:    'design',
        description: '',
        tags:        [],
        video:       '',
        image:       '',
        embed:       '',
        videoStart:  '',
        detailPage:  '',
        year:        '',
        type:        '',
        institution: '',
        links:       [],
    };

    let descChunks  = [];
    let afterTitle  = false;
    let descDone    = false;

    for (const raw of lines) {
        const line = raw.trim();

        // ── Title from # heading ─────────────────────────────────
        if (!project.title && line.startsWith('#')) {
            project.title = line.replace(/^#+\s*/, '').trim();
            afterTitle = true;
            continue;
        }

        // ── Key: value pairs (anywhere in the file) ──────────────
        const kv = line.match(/^([a-zA-Z_]+)\s*:\s*(.+)$/);
        if (kv) {
            descDone = true; // stop collecting description
            const key = kv[1].toLowerCase();
            const val = kv[2].trim();

            switch (key) {
                case 'title':       project.title      = val; break;
                case 'id':          project.id         = slugify(val); break;
                case 'category':    project.category   = val.toLowerCase(); break;
                case 'year':        project.year       = val; break;
                case 'video':       project.video      = val; break;
                case 'image':       project.image      = val; break;
                case 'embed':       project.embed      = val; break;
                case 'videostart':  project.videoStart = val; break;
                case 'detail':
                case 'detailpage':
                case 'link':        project.detailPage = val; break;
                case 'links':       project.links       = val.split(',').map(s => s.trim()); break;
                case 'tags':        project.tags        = val.split(',').map(s => s.trim().toLowerCase()); break;
                case 'type':        project.type        = val; break;
                case 'institution': project.institution = val; break;
            }
            continue;
        }

        // ── Description: plain text lines after the title ─────────
        if (afterTitle && !descDone) {
            if (line) {
                descChunks.push(line);
            } else if (descChunks.length > 0) {
                // First blank line after description text ends it
                descDone = true;
            }
        }
    }

    project.description = descChunks.join(' ');

    return project;
}

function slugify(str) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ── Read files ─────────────────────────────────────────────────────────────────
if (!fs.existsSync(CONTENT_DIR)) {
    console.error('Error: content/ folder not found. Create it and add .md files.');
    process.exit(1);
}

const files = fs.readdirSync(CONTENT_DIR)
    .filter(f => f.endsWith('.md') && !f.startsWith('_') && f !== 'about.md');

if (files.length === 0) {
    console.warn('No .md files found in content/ (files starting with _ are ignored).');
    process.exit(0);
}

const projects = files
    .map(f => parseProjectFile(fs.readFileSync(path.join(CONTENT_DIR, f), 'utf8'), f))
    .filter(p => p.title); // skip files with no title

// Sort: by year desc, then title
projects.sort((a, b) => {
    if (b.year !== a.year) return (b.year || '0').localeCompare(a.year || '0');
    return a.title.localeCompare(b.title);
});

// ── Parse about.md ────────────────────────────────────────────────────────────
function parseAbout(content) {
    const lines = content.split(/\r?\n/);
    const about = { bio: [], sections: [] };
    let current = null;
    let inBio = false;

    for (const raw of lines) {
        const line = raw.trim();
        if (line.startsWith('# ')) { inBio = true; continue; } // skip h1 title
        if (line.startsWith('## ')) {
            current = { heading: line.replace(/^##\s*/, ''), items: [] };
            about.sections.push(current);
            inBio = false;
            continue;
        }
        if (line.startsWith('- ') && current) {
            current.items.push(line.replace(/^-\s*/, ''));
            continue;
        }
        if (inBio && line) {
            about.bio.push(line);
        }
    }
    return about;
}

const aboutFile = path.join(CONTENT_DIR, 'about.md');
let aboutData = { bio: [], sections: [] };
if (fs.existsSync(aboutFile)) {
    aboutData = parseAbout(fs.readFileSync(aboutFile, 'utf8'));
}

// ── Write output ──────────────────────────────────────────────────────────────
const json = JSON.stringify(projects, null, 4);
const aboutJson = JSON.stringify(aboutData, null, 4);
const output = `// Auto-generated by sync-projects.js — do not edit manually.
// Add or edit .md files in the content/ folder, then run:  node sync-projects.js

const projects = ${json};

const aboutContent = ${aboutJson};
`;

fs.writeFileSync(OUTPUT, output, 'utf8');

console.log(`\n✓ projects-data.js updated — ${projects.length} project(s)\n`);
projects.forEach((p, i) => {
    console.log(`  ${String(i + 1).padStart(2)}. [${p.category}] ${p.title} ${p.year ? '(' + p.year + ')' : ''}`);
});
console.log('');
