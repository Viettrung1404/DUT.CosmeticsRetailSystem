const fs = require('fs');
const path = require('path');
const os = require('os');

const HOME_DIR = os.homedir();
const MASTER_SKILLS_DIR = path.join(HOME_DIR, '.agents', 'skills');
const WORKSPACE_SKILLS_DIR = path.resolve(__dirname, 'skills');

function ensureWorkspaceDir() {
  if (!fs.existsSync(WORKSPACE_SKILLS_DIR)) {
    fs.mkdirSync(WORKSPACE_SKILLS_DIR, { recursive: true });
  }
}

function getSkillDescription(skillDir) {
  const skillFile = path.join(skillDir, 'SKILL.md');
  if (!fs.existsSync(skillFile)) return '';
  const content = fs.readFileSync(skillFile, 'utf8');
  const match = content.match(/description:\s*(?:>-\s*)?([^\n\r]+)/i);
  return match ? match[1].replace(/["']/g, '').trim() : '';
}

const command = process.argv[2];
const arg = process.argv[3];

switch (command) {
  case 'list': {
    ensureWorkspaceDir();
    const skills = fs.readdirSync(WORKSPACE_SKILLS_DIR).filter(item => {
      return fs.existsSync(path.join(WORKSPACE_SKILLS_DIR, item, 'SKILL.md'));
    });
    console.log(`\n=== Active Workspace Skills (${skills.length}) ===\n`);
    for (const skill of skills) {
      const desc = getSkillDescription(path.join(WORKSPACE_SKILLS_DIR, skill));
      console.log(`- ${skill}: ${desc || '(No description)'}`);
    }
    console.log('');
    break;
  }

  case 'search': {
    if (!arg) {
      console.error('Usage: node manage-skills.js search <keyword>');
      process.exit(1);
    }
    if (!fs.existsSync(MASTER_SKILLS_DIR)) {
      console.error(`Master skills directory not found at ${MASTER_SKILLS_DIR}`);
      process.exit(1);
    }
    const keyword = arg.toLowerCase();
    const all = fs.readdirSync(MASTER_SKILLS_DIR).filter(item => {
      return fs.statSync(path.join(MASTER_SKILLS_DIR, item)).isDirectory();
    });
    const matches = all.filter(name => {
      if (name.toLowerCase().includes(keyword)) return true;
      const desc = getSkillDescription(path.join(MASTER_SKILLS_DIR, name));
      return desc.toLowerCase().includes(keyword);
    });

    console.log(`\n=== Found ${matches.length} skills matching "${arg}" ===\n`);
    for (const skill of matches.slice(0, 30)) {
      const desc = getSkillDescription(path.join(MASTER_SKILLS_DIR, skill));
      console.log(`- ${skill}: ${desc}`);
    }
    if (matches.length > 30) {
      console.log(`... and ${matches.length - 30} more.`);
    }
    console.log(`\nTo install one, run: node .agents/manage-skills.js add <skill-name>\n`);
    break;
  }

  case 'add': {
    if (!arg) {
      console.error('Usage: node manage-skills.js add <skill-name>');
      process.exit(1);
    }
    ensureWorkspaceDir();
    const src = path.join(MASTER_SKILLS_DIR, arg);
    const dest = path.join(WORKSPACE_SKILLS_DIR, arg);

    if (!fs.existsSync(src)) {
      console.error(`Skill "${arg}" not found in master library (${MASTER_SKILLS_DIR}).`);
      process.exit(1);
    }

    fs.cpSync(src, dest, { recursive: true });
    console.log(`✓ Successfully added skill "${arg}" to workspace.`);
    break;
  }

  case 'remove': {
    if (!arg) {
      console.error('Usage: node manage-skills.js remove <skill-name>');
      process.exit(1);
    }
    const target = path.join(WORKSPACE_SKILLS_DIR, arg);
    if (!fs.existsSync(target)) {
      console.error(`Skill "${arg}" is not installed in this workspace.`);
      process.exit(1);
    }
    fs.rmSync(target, { recursive: true, force: true });
    console.log(`✓ Removed skill "${arg}" from workspace.`);
    break;
  }

  default: {
    console.log(`
Antigravity Skills Manager for PBL6 Workspace
Usage:
  node .agents/manage-skills.js list            - List active workspace skills
  node .agents/manage-skills.js search <query>  - Search 1,840+ skills repository
  node .agents/manage-skills.js add <name>      - Add a skill to this workspace
  node .agents/manage-skills.js remove <name>   - Remove a skill from workspace
`);
    break;
  }
}
