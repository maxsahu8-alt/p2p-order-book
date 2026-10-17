from playwright.sync_api import sync_playwright
T="""Transaction Successful
08:10 pm on 17 Oct 2026
Paid to
VL
Vinay Lalwani
••••••7529@ptsbi
₹1,722.6
Banking Name : Vinay Lalwani
Sent to : Paytm • XXXXXX7529@ptsbi
Transfer Details
PhonePe Transaction ID
T2610172010297873566405
Debited from
XXXXXX2594
₹1,722.6
UTR: 342637687711
Send Again View History Split Expense Share Receipt"""
f=0
def chk(n,c):
    global f
    print(("PASS " if c else "FAIL ")+n); f+=0 if c else 1
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file:///home/claude/p2p-tracker.html');pg.wait_for_timeout(1000)
    P=pg.evaluate("t=>{const x=payParse(t);return {l4:x.last4,from:x.fromLast4,amt:x.amount,utr:x.utr,recv:x.receiver}}",T)
    print(P)
    chk("paying account is 2594, not seller's 7529",P["l4"]=="2594")
    chk("amount and UTR still read",P["amt"]==1722.6 and P["utr"]=="342637687711")
    chk("receiver is Vinay Lalwani",P["recv"]=="Vinay Lalwani")
    L=pg.evaluate("t=>payParse(t).last4",  "Paid from XX4521 SBI\nUTR 123456789012\n₹500")
    chk("normal a/c masks still work",L=="4521")
    for n,t in [("amount on the same line","Paid to\nVinay Lalwani\n••••••7529@ptsbi\n₹1,722.6\nSent to : Paytm • XXXXXX7529@ptsbi\nDebited from\nXXXXXX2594 ₹1,722.6\nUTR: 342637687711"),
                ("UPI ID split by OCR","Paid to\nVinay Lalwani\nXXXXXX7529 @ptsbi\nDebited from\nXXXXXX2594\nUTR: 342637687711\n₹1,722.6")]:
        chk("account 2594 when "+n,pg.evaluate("t=>payParse(t).last4",t)=="2594")
    H=lambda v:pg.evaluate("v=>ixL4(v)",v)
    chk("helper: UPI id only gives nothing",H("Paytm • XXXXXX7529@ptsbi")=="")
    chk("helper: account beats UPI id",H("SBI XXXXXX2594 Paytm • XXXXXX7529@ptsbi")=="2594")
    chk("helper: plain last4",H("2594")=="2594" and H("HDFC Bank XX1234")=="1234")
    chk("no page errors",not errs)
print("FAILS",f)
