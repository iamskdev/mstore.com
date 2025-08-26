const fs = require('fs');
const path = require('path');

const SCRIPT_DIR = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(SCRIPT_DIR + '/../../');
const ROOT = PROJECT_ROOT; // Ensure ROOT points to the project root

const OUTPUT_FLAT = path.resolve(PROJECT_ROOT + '/docs/path-is-flat.md');
const OUTPUT_TREE = path.resolve(PROJECT_ROOT + '/docs/path-structured.md');
const FLAG_FILE = path.resolve(PROJECT_ROOT + null); // flag file '/.vscode/tasks/.path-tree-ran.lock'

const args = process.argv.slice(2);
const forceRun = args.includes('--force');

let excludeDirs = ['node_modules', '.git', '.vscode', 'objects']; // Always exclude node_modules by default

const excludeArgIndex = args.findIndex(arg => arg.startsWith('--exclude='));
if (excludeArgIndex !== -1) {
  const excludeValue = args[excludeArgIndex].split('=')[1];
  excludeDirs = excludeDirs.concat(excludeValue.split(','));
}

if (fs.existsSync(FLAG_FILE) && !forceRun) {
  console.log('⏭️ Skipped: Already ran once this session.');
  process.exit(0);
}

function getISTDateTime() {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date());
}

function safeList(dir) {
  return fs.readdirSync(dir).filter(f => !excludeDirs.includes(f)).sort();
}

function collectFlatPaths(dir) {
  let result = [];
  function recurse(currentPath) {
    const items = safeList(currentPath);
    for (const item of items) {
      const fullPath = path.join(currentPath, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        recurse(fullPath);
      } else {
        result.push(fullPath);
      }
    }
  }
  recurse(dir);
  return result.map(p => p.replace(/\//g, '\\'));
}

function buildTree(dir, prefix = '', isLastFolder = true, isRoot = false) {
  const lines = [];
  const items = safeList(dir);
  const files = items.filter(f => fs.statSync(path.join(dir, f)).isFile());
  const folders = items.filter(f => fs.statSync(path.join(dir, f)).isDirectory());

  if (isRoot) {
    files.forEach((file, i) => {
      const isLast = (i === files.length - 1) && folders.length === 0;
      const connector = isLast ? '└── ' : '├── ';
      lines.push(`${connector}${file}`);
    });
  }

  folders.forEach((folder, i) => {
    const isLast = i === folders.length - 1 && files.length === 0;
    const connector = isLast ? '└── ' : '├── ';
    const childPrefix = prefix + (isLast ? '    ' : '│   ');
    lines.push(`${prefix}${connector}📁 ${folder}\\`);
    lines.push(...buildTree(path.join(dir, folder), childPrefix, isLast, false));
  });

  if (!isRoot) {
    files.forEach((file, i) => {
      const isLast = i === files.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      lines.push(`${prefix}${connector}${file}`);
    });
  }

  return lines;
}

function writeOutputs() {
  const now = getISTDateTime();
  const flatPaths = collectFlatPaths(ROOT);
  const treeLines = buildTree(ROOT, '', true, true);

  const flatHeader = `# 📁 Project Path Tree (Gemini-friendly)\n📅 Last Updated: ${now}\n\n`;
  const treeHeader = `# 📁 mStore Path Structure\n📅 Last Updated: ${now}\n\n`;

  fs.writeFileSync(OUTPUT_FLAT, flatHeader + flatPaths.join('\n'));
  fs.writeFileSync(OUTPUT_TREE, treeHeader + treeLines.join('\n'));

  console.log('✅ Files generated:');
  console.log('📄', OUTPUT_TREE);
  console.log('📄', OUTPUT_FLAT);
  console.log('🕒 IST Time:', now);
}

writeOutputs();

// ✅ Only create lock file in non-force mode
if (!forceRun) {
  fs.writeFileSync(FLAG_FILE, 'done');
}