# KuCoin prints the 24-character order number over two lines. A misread start (6 as G, 1 as l) and the wrapped end must both come out right.
from playwright.sync_api import sync_playwright
import os
APP=os.environ.get("APP_FILE","/home/claude/p2p-tracker.html")
f=0
def chk(n,c):
    global f
    print(("PASS " if c else "FAIL ")+n); f+=0 if c else 1
base="Transaction Complete\nSuccess! 48.1536 USDT has been added to your Funding Account.\nBuy USDT\nTotal Amount 4,695.94 INR\nUSDT Price 97.52 INR\nAmount 48.1536 USDT\nCounterparty SUBODH LOHRA\nLOHRA(sub***@gmail.com)\n"
W="6ae0366aa1d4060001e230bf"
C=[("clean, tail on next line","Order Number 6ae0366aa1d4060001e23\n0bf\nCreated At 10/27/2026 10:58:10",W),
("misread start, tail on next line","Order Number Gae0366aald4060001e23\n0bf\nCreated At 10/27/2026 10:58:10",W),
("tail after the Created At line","Order Number Gae0366aald4060001e23\nCreated At 10/27/2026 10:58:10\n0bf",W),
("tail on the same line","Order Number Gae0366aald4060001e23 0bf\nCreated At 10/27/2026 10:58:10",W),
("tail read with a letter O","Order Number Gae0366aald4060001e23\nObf\nCreated At 10/27/2026 10:58:10",W),
("already complete","Order Number 6ae0366aa1d4060001e230bf\nCreated At 10/27/2026 10:58:10",W),
("no tail found: nothing is invented","Order Number Gae0366aald4060001e23\nCreated At 10/27/2026 10:58:10","Gae0366aald4060001e23"),
("a word is not taken as the tail","Order Number Gae0366aald4060001e23\nxyz\nCreated At 10/27/2026 10:58:10","Gae0366aald4060001e23")]
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page();errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto("file://"+APP);pg.wait_for_timeout(1200)
    for n,t,w in C:
        got=pg.evaluate("(t)=>ixOrdFrom(t,90).id",base+t)
        chk(n+" -> "+w,got==w)
    chk("no page errors",not errs);b.close()
print("FAILS",f)
