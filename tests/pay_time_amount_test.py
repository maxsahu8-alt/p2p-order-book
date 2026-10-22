# An amount like 19,407.46 followed by "AM" (the avatar letters) must never be read as the time 07:46 AM.
from playwright.sync_api import sync_playwright
import os
APP=os.environ.get("APP_FILE","/home/claude/p2p-tracker.html")
f=0
def chk(n,c):
    global f
    print(("PASS " if c else "FAIL ")+n); f+=0 if c else 1
C=[("time before the date, amount + AM after","Transaction Successful 02:11 pm on 22 Oct 2026 Paid to ₹19,407.46 AM Amit Mishra","14:11"),
 ("time before the date, avatar on its own line","Transaction Successful\n02:11 pm on 22 Oct 2026\nAM\nAmit Mishra\n₹19,407.46\nAM","14:11"),
 ("time right after the date still works","Paid ₹500 22 Oct 2026, 11:47 AM Ref 123","11:47"),
 ("time right after, 12-hour PM","22 Oct 2026 03:05 PM Success","15:05"),
 ("OCR dot time 11.47 AM still works","Paid on 22 Oct 2026 at 11.47 AM","11:47"),
 ("numeric date with amount before it","₹1,407.46 AM 22/10/2026 09:15 PM","21:15")]
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page();pg.goto('file://'+APP);pg.wait_for_timeout(1200)
    for n,t,w in C:
        got=pg.evaluate("(t)=>{const d=new Date(payTime(t));return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')}",t)
        chk(n+" -> "+w,got==w)
    P=pg.evaluate("(t)=>{const P=payParse(t);return new Date(P.time).getHours()+':'+new Date(P.time).getMinutes()}",C[0][1])
    chk("payParse gives 14:11",P=="14:11")
    b.close()
print("FAILS",f)
