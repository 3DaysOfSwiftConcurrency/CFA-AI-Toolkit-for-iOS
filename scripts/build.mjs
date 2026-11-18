import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { root } from './sync.mjs';
import { validate } from './validate.mjs';
import { inventory, writeJSON, isReleasePath } from './files.mjs';
function installMcpRuntime(output, execute = spawnSync) {
  const result = execute('npm', ['ci', '--omit=dev', '--ignore-scripts'], {
    cwd: output,
    encoding: 'utf8'
  });
  if (result.error || result.status !== 0) {
    const detail = `${result.stderr ?? ''}${result.stdout ?? ''}`.trim();
    throw Error(`Could not bundle the CFA Migration Engine runtime: ${detail || result.error?.message || `npm exited ${result.status}`}`);
  }
}

export function stageRelease(output,base=root,{includeMcpRuntime=false, installRuntime=installMcpRuntime}={}) {
  validate(base);
  output=path.resolve(output);
  if(fs.existsSync(output)) throw Error('Release output must be a new directory.');
  const copy=(relative) => {
    const destination=path.join(output,relative);
    fs.mkdirSync(path.dirname(destination),{recursive:true});
    fs.cpSync(path.join(base,relative),destination,{recursive:true,errorOnExist:true,force:false,
      filter: source => isReleasePath(path.relative(base, source))});
  };
  for(const relative of ['.codex-plugin','plugin.json','mcp.json','package.json','package-lock.json','mcp','readme-images','skills','LICENSE','CONTRIBUTING.md','BENEFITS.md','CFA-ENGINEERING-PHILOSOPHY.md','Install.command','Install Xcode Template.command','docs','architecture','evals','templates','starter-apps','scripts/create-cfa-project.mjs','scripts/verify-starter-projects.mjs','scripts/install.mjs','scripts/install-xcode-template.mjs','scripts/files.mjs','scripts/skill-names.mjs','scripts/release-exclusions.json'])copy(relative);
  fs.copyFileSync(path.join(base,'README.md'),path.join(output,'README.md'));
  if (includeMcpRuntime) installRuntime(output);
  writeJSON(path.join(output,'checksums.json'),inventory(output));
  validate(output,{source:false});
  return output;
}
if(process.argv[1]&&fs.existsSync(process.argv[1])&&import.meta.url===pathToFileURL(fs.realpathSync(process.argv[1])).href) {
  try {
    if(process.argv.length<3 || process.argv.length>4 || (process.argv[3] && process.argv[3]!=='--include-mcp-runtime')) throw Error('Usage: node scripts/build.mjs <new-output-folder> [--include-mcp-runtime]');
    console.log(stageRelease(process.argv[2],root,{includeMcpRuntime:process.argv[3]==='--include-mcp-runtime'}));
  }catch(error){console.error(error.message);process.exitCode=1;}
}
