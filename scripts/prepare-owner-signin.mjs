import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

/** Preserve Factory's existing labeled, password-manager-compatible form. */
export function enableOwnerForm(source) {
  const pattern = /\(\((\w+)=([\w.]+)\)==null\?void 0:\1\.provider\)==="better-auth"/g;
  const matches = [...source.matchAll(pattern)];
  if (matches.length !== 1) throw new Error('Factory sign-in bundle changed; review the compatibility patch.');
  return source.replace(pattern, '(["better-auth","Owner access"].includes(($1=$2)==null?void 0:$1.provider))');
}

export function enableOwnerTokenForm(source) {
  let result = enableOwnerForm(source);
  function replaceOnce(before, after) {
    if (result.split(before).length !== 2) throw new Error('Factory token-form markup changed; review required.');
    result = result.replace(before, after);
  }
  replaceOnce('function o1t({returnTo:e,signUpDisabled:t})', 'function o1t({returnTo:e,signUpDisabled:t,ownerOnly=false})');
  replaceOnce('l.jsx(o1t,{returnTo:s,signUpDisabled:', 'l.jsx(o1t,{returnTo:s,ownerOnly:t.data?.provider==="Owner access",signUpDisabled:');
  replaceOnce('await rze(n,{email:o,password:u})', 'await rze(n,{email:ownerOnly?"owner@factory.cogerentor.com":o,password:u})');
  const email = 'l.jsxs("label",{className:"text-neutral5 flex flex-col gap-2 text-sm font-medium",children:["Email",l.jsx(pa,{type:"email",size:"lg",placeholder:"you@company.com",autoComplete:"email",required:!0,value:o,onChange:_=>c(_.target.value)})]})';
  replaceOnce(email, 'ownerOnly?null:' + email);
  replaceOnce('children:["Password",l.jsx(pa,{type:"password",size:"lg",placeholder:"Enter your password"',
    'children:[ownerOnly?"Токен доступа":"Password",l.jsx(pa,{type:"password",size:"lg",placeholder:ownerOnly?"Вставьте токен владельца":"Enter your password"');
  replaceOnce('children:g?"Please wait…":r==="sign-up"?"Create account":"Sign in"',
    'children:g?"Please wait…":ownerOnly?"Войти":r==="sign-up"?"Create account":"Sign in"');
  replaceOnce('children:"Account creation is managed by your administrator."',
    'children:ownerOnly?"Введите токен владельца Factory.":"Account creation is managed by your administrator."');
  return result;
}

async function patchAssets(directory) {
  let patched = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) patched += await patchAssets(path);
    else if (/^index-.*\.js$/.test(entry.name)) {
      const source = await readFile(path, 'utf8');
      if (!source.includes('Continue with GitHub') || !source.includes('"better-auth"')) continue;
      await writeFile(path, enableOwnerTokenForm(source));
      execFileSync(process.execPath, ['--check', path], { stdio: 'pipe' });
      patched++;
    }
  }
  return patched;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const count = await patchAssets('.mastra/output');
  if (count !== 1) throw new Error(`Expected one Factory sign-in bundle; found ${count}.`);
  console.log('Owner credential form enabled in one verified Factory bundle.');
}
