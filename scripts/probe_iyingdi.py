import json
import re
import urllib.request

UA = {"User-Agent": "Mozilla/5.0", "Platform": "pc", "Login-Token": "nologin"}

for url in [
    "https://www.iyingdi.com/tz/tool/general/verse",
    "https://www.iyingdi.com/web/tools/verse/cards",
]:
    req = urllib.request.Request(url, headers=UA)
    html = urllib.request.urlopen(req, timeout=20).read().decode("utf-8", "ignore")
    print("===", url, "len", len(html))
    for m in re.finditer(r"https?://[a-zA-Z0-9_./-]+", html):
        u = m.group(0)
        if any(k in u for k in ("api", "verse", "card", "tool")):
            print(u)
    print("---")
