# Lighthouse v0.6-v0.9 Fix 3

Fixes:
- Click/tap responsiveness issue
- Stronger UI z-index so controls remain clickable
- Safer sign out handling
- Safer account/user listener error handling

Upload all files to the GitHub repo.

After upload, open the clean URL only:
https://quevenrecorte.github.io/lighthouse/

Then hard refresh:
- Windows Chrome: Ctrl + F5
- Or open in Incognito first to avoid old cached JavaScript

Realtime Database rules can stay the same as Fix 2 if you already pasted them.


Fix4 note: fixes a read-receipt loop where seen markers kept writing repeatedly and froze the page.
