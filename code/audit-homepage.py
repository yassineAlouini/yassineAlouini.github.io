"""Run pinned mobile/desktop Lighthouse audits without adding site dependencies.

python3 code/audit-homepage.py http://localhost:8771/ --output-dir /tmp/site-audit
Requires Node/npm and Chrome; CHROME_PATH can override Playwright Chromium.
Reports default to a new temporary directory, outside the repository.
"""
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

LIGHTHOUSE_VERSION='13.5.0'


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('url',nargs='?',default='http://localhost:8771/')
    parser.add_argument('--preset',choices=['mobile','desktop','all'],default='all')
    parser.add_argument('--label',default='audit')
    parser.add_argument('--output-dir',type=Path)
    args=parser.parse_args()
    directory=args.output_dir or Path(tempfile.mkdtemp(prefix='homepage-lighthouse-'))
    directory.mkdir(parents=True,exist_ok=True)
    environment=os.environ.copy()
    if not environment.get('CHROME_PATH'):
        executable=shutil.which('google-chrome') or shutil.which('chromium')
        if not executable:
            from playwright.sync_api import sync_playwright
            with sync_playwright() as p:
                executable=p.chromium.executable_path
        environment['CHROME_PATH']=executable
    if not Path(environment['CHROME_PATH']).is_file():
        parser.error('Chrome not found; set CHROME_PATH to a Chrome/Chromium executable.')
    presets=['mobile','desktop'] if args.preset=='all' else [args.preset]
    for preset in presets:
        prefix=directory/f'{args.label}-{preset}'
        command=['npm','exec','--yes',f'--package=lighthouse@{LIGHTHOUSE_VERSION}','--',
                 'lighthouse',args.url,'--chrome-flags=--headless --no-sandbox',
                 '--output=json','--output=html',f'--output-path={prefix}','--quiet']
        if preset=='desktop':
            command.append('--preset=desktop')
        print(f'Running {preset} Lighthouse {LIGHTHOUSE_VERSION}…',flush=True)
        subprocess.run(command,env=environment,check=True)
        report=json.loads(Path(f'{prefix}.report.json').read_text())
        scores={key:round(report['categories'][key]['score']*100)
                for key in ['performance','accessibility','best-practices','seo']}
        print(preset,scores,flush=True)
        print(f'HTML report: {prefix}.report.html',flush=True)


if __name__=='__main__':
    main()
