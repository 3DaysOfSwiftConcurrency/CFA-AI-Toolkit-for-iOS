import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'starter-apps', 'CFA Blank');
const templateRoot = path.join(root, 'templates/Xcode/Project Templates/iOS/Application');

function replaceNames(directory) {
  for (const relative of fs.readdirSync(directory, { recursive: true, encoding: 'utf8' })) {
    const file = path.join(directory, relative);
    if (!fs.statSync(file).isFile() || !/\.(swift|pbxproj|xcscheme|plist|md)$/.test(relative)) continue;
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8')
      .replaceAll('GitRepos', 'CFABlank')
      .replaceAll('Git Repos', 'CFA Blank')
      .replaceAll('___PACKAGENAME:identifier___', 'CFABlank'));
  }
}

function renamePaths(directory, from, to) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const source = path.join(directory, entry.name);
    if (entry.isDirectory()) renamePaths(source, from, to);
    const target = path.join(directory, entry.name.replaceAll(from, to));
    if (target !== source) fs.renameSync(source, target);
  }
}

export function createCFABlankSkeleton() {
  if (fs.existsSync(output)) throw Error(`Skeleton already exists: ${output}`);
  fs.cpSync(path.join(root, 'starter-apps', 'Git Repos'), output, { recursive: true });
  fs.rmSync(path.join(output, 'GitRepos'), { recursive: true });
  fs.rmSync(path.join(output, 'GitReposTests'), { recursive: true });
  fs.cpSync(path.join(templateRoot, 'CFA App.xctemplate/Source/Application'), path.join(output, 'GitRepos'), { recursive: true });
  fs.cpSync(path.join(templateRoot, 'CFA App Tests.xctemplate/Source'), path.join(output, 'GitReposTests'), { recursive: true });
  fs.rmSync(path.join(output, 'GitRepos', 'Assets.xcassets'), { recursive: true });
  fs.cpSync(path.join(templateRoot, 'CFA App.xctemplate/Source/Assets.xcassets'), path.join(output, 'GitRepos', 'Assets.xcassets'), { recursive: true });
  fs.mkdirSync(path.join(output, 'GitRepos', '3 - App Resources'), { recursive: true });
  fs.writeFileSync(path.join(output, 'GitRepos', '3 - App Resources', 'PrivacyInfo.xcprivacy'), `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict><key>NSPrivacyAccessedAPITypes</key><array/></dict></plist>\n`);
  renamePaths(output, 'GitRepos', 'CFABlank');
  replaceNames(output);
  fs.writeFileSync(path.join(output, 'README.md'), '# CFA Blank\n\nA minimal, openable CFA foundation for a new product. It deliberately has no product feature, Settings, networking, cache, or required-reason API declaration. Add those only when the product needs them.\n');
  return output;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try { console.log(`Created ${createCFABlankSkeleton()}`); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
