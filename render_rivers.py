import subprocess
import os
import shutil

temp_html = os.path.join(os.environ['TEMP'], 'render_rivers.html')
with open(temp_html, 'w', encoding='utf-8') as f:
    f.write('''<!DOCTYPE html>
<html>
<head>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body, html { width: 3117px; height: 4099px; background: transparent; overflow: hidden; }
  svg { width: 3117px; height: 4099px; display: block; }
</style>
</head>
<body>
''')
    with open('public/map_rivers.svg', 'r', encoding='utf-8') as svg_f:
        f.write(svg_f.read())
    f.write('</body></html>')

out_temp = os.path.join(os.environ['TEMP'], 'rivers_rendered.png')

cmd = [
    r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    '--headless',
    '--hide-scrollbars',
    '--window-size=3117,4099',
    f'--screenshot={out_temp}',
    f'file:///{temp_html.replace(chr(92), "/")}'
]

print("Rendering with Edge...")
subprocess.run(cmd, check=True)

if os.path.exists(out_temp):
    target = 'rivers_for_trace.png'
    shutil.copy(out_temp, target)
    print("Success! Created:", target, "Size:", os.path.getsize(target))
