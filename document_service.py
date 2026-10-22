"""本機公文文字擷取；無第三方套件，僅監聽127.0.0.1。"""
import argparse
from datetime import date
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import re
import unicodedata
import webbrowser

ROOT = Path(__file__).resolve().parent
ENDINGS = r"(?:計畫|方案|專案|活動|工程)"


def fullwidth_punctuation(text):
    return ''.join(chr(ord(ch) + 0xFEE0) if any(lo <= ord(ch) <= hi for lo, hi in ((0x21, 0x2F), (0x3A, 0x40), (0x5B, 0x60), (0x7B, 0x7E))) else ch for ch in text)


def parse_approved_amount(text):
    from decimal import Decimal
    values = []
    def add(raw):
        total, last_unit, covered = Decimal(0), float('inf'), ''
        for m in re.finditer(r"(\d[\d,]*(?:\.\d+)?)(億|萬|千|仟|百|佰)?", raw):
            covered += m.group(0)
            if not re.fullmatch(r"(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?", m.group(1)):
                return
            unit = {'億': 10**8, '萬': 10000, '千': 1000, '仟': 1000, '百': 100, '佰': 100}.get(m.group(2), 1)
            if unit >= last_unit:
                return
            last_unit = unit
            total += Decimal(m.group(1).replace(',', '')) * unit
        if covered == raw and total == int(total) and 0 <= total <= 999999999999 and str(int(total)) not in values:
            values.append(str(int(total)))
    for m in re.finditer(r"(?:新[臺台]幣|NT\$)?(?:\((?:以下同|下同)\))?([0-9][0-9,.億萬千仟百佰]*)元", text, re.I):
        context = text[max(0, m.start()-90):m.start()]
        clause = re.split(r"[，。；;]|,(?!\d)", context)[-1]
        if re.search(r"實支|實際支出|已支|賸餘|剩餘|繳回|自籌|申請|原核定|總經費|分期|本期|第一期|第二期", clause):
            continue
        if re.search(r"核定|核准|核撥|核予補助|補助|撥付", clause) or (re.search(r"計", clause) and (re.search(r"經費", context) or re.search(r"(?:核定|核准)[^，。；;]*(?:交通費|鐘點費|出席費|膳費|住宿費|材料費|保險費)[，,]計(?:新[臺台]幣)?$", context))):
            add(m.group(1))
    for m in re.finditer(r"(?:核定數|核定金額)[:：](?:新[臺台]幣)?([0-9][0-9,.億萬千仟百佰]*)(?:元)?", text):
        add(m.group(1))
    approved = values[0] if len(values) == 1 else ''
    hint = '找到多筆不同金額，請對照公文選擇本案核定數。' if len(values) > 1 else '已擷取核定數，請確認為本案全額核定金額。' if approved else '未找到明確核定數，原核定數欄位會保留，可手動填寫。'
    return {'approved': approved, 'amountCandidates': values, 'amountHint': hint}


def unquoted_projects(subject):
    output = []
    prefix = r"^(?:有關|茲|本府|同意|核定|核准|補助|貴校|本校|各校|貴單位|辦理|推動|執行|申請|所提|所報|提報|申辦|之)"
    for clause in re.split(r"[，,。；;！？!?]", subject):
        if not re.match(r"^(?:有關|茲|本府|同意|核定|核准|補助|貴校|本校|貴單位)", clause):
            continue
        clean = clause
        while re.match(prefix, clean):
            clean = re.sub(prefix, "", clean, count=1)
        budget = re.search(r"(?:補助經費|經費補助|所需經費|所需款項|補助款|經費|款項)(?=新臺幣|計|共|為|業|已|案|一案|核定|核准|[\d壹貳參肆伍陸柒捌玖拾佰仟萬零]|$)", clean)
        if budget:
            clean = clean[:budget.start()]
        clean = re.sub(r"(?:一案|乙案|予以核定|准予補助)$", "", clean)
        for part in re.sub(r"(計畫|方案|專案|活動|工程)(?:及|暨|與|、)", lambda m: m.group(1) + "\x00", clean).split("\x00"):
            while re.match(prefix, part):
                part = re.sub(prefix, "", part, count=1)
            strong = re.match(r"^(.{2,140}(?:計畫|方案|專案|活動|工程))(?:補助|經費|辦理|執行|核定|案|$)", part)
            fee = re.fullmatch(r".{2,140}(?:交通費|鐘點費|出席費|膳費|住宿費|材料費|保險費)", part)
            name = strong.group(1) if strong else part if budget or fee else ""
            if (4 <= len(name) <= 160 and not re.match(r"^(?:相關|旨揭|前揭|上開|該項|本項|本案|賸餘款|核銷|結報|繳回|請|款項)", name)
                    and not re.search(r"(?:要點|辦法|規定|事宜)$", name) and name not in output):
                output.append(name)
    return output


def parse_document(text):
    t = re.sub(r"[ \t\u3000]+", "", unicodedata.normalize("NFKC", text)).replace("\r", "")
    flat = t.replace("\n", "")
    pattern = r"(?:中華民國|民國)?(\d{2,4})年(\d{1,2})月(\d{1,2})日"
    m = re.search(r"發文日期[:：]?" + pattern, flat) or re.search(pattern, flat)
    day = ""
    if m:
        y, mo, d = map(int, m.groups())
        y = y - 1911 if y > 1911 else y
        try:
            date(y + 1911, mo, d)
            day = f"{y}年{mo}月{d}日"
        except ValueError:
            pass
    n = re.search(r"發文字號[:：]?([^\n]{0,40}?第[\d\-]+號)", t.replace(":\n", ":"))
    if not n:
        n = re.search(r"([^\n:：]{1,18}字第[\d\-]+號)", t)
    subject_match = re.search(r"主旨[:：]?(.*)", flat)
    raw_subject = re.split(r"(?:說明|辦法|正本|副本|附件)[:：]", subject_match.group(1), maxsplit=1)[0] if subject_match else ""
    subject = raw_subject.replace("特殊需求學生發所與輔導", "特殊需求學生發掘與輔導").replace("學前階段巡迴輔導教師巡迴了服務交通費", "學前階段巡迴輔導教師巡迴服務交通費")
    candidates = []
    def add(v):
        v = v.strip(" \n:：，。；、\"")
        if 3 <= len(v) <= 160 and v not in candidates:
            candidates.append(v)
    # 先找主旨中有明確引號的計畫名稱，保留年度與完整名稱。
    pairs = {"「": "」", "『": "』", '"': '"', "“": "”"}
    stack = []
    quotes = []
    for i, ch in enumerate(subject):
        if stack and ch == stack[-1][1]:
            start, _ = stack.pop()
            before = subject[:start]
            if re.search(r"(?:以下簡稱|以下稱|下稱|簡稱)[:：]?$", before):
                continue
            title = subject[start + 1:i]
            year = re.search(r"(\d{2,4}(?:學年度|年度|年)(?:\d{1,2}月?(?:至|到|[-~～])\d{1,2}月|\d{1,2}月)?)$", before)
            quotes.append(year.group(1) + "「" + title + "」" if year else title)
        elif ch in pairs:
            stack.append((i, pairs[ch]))
    for q in sorted(quotes, key=len, reverse=True):
        if re.search(ENDINGS, q):
            add(q)
    if not candidates:
        for q in sorted(quotes, key=len, reverse=True):
            if len(q) >= 6 and not re.search(r"(?:法規|要點|規定|辦法|注意事項)$", q):
                add(q)
    label = re.search(r"(?:專案名稱|計畫名稱)[:：]([^\n。；]{3,160})", t)
    if label:
        candidates.insert(0, label.group(1).strip())
        candidates = list(dict.fromkeys(candidates))
    method = "quoted" if candidates else ""
    if not candidates and subject:
        for value in unquoted_projects(subject):
            add(value)
        if candidates:
            method = "inferred"
    if not candidates and subject:
        # 無引號時取主旨中以年度開頭的計畫片段，避免整句當成名稱。
        for m in re.finditer(r"((?:\d{2,4}年(?:度|學年度)?|\d{2,3}學年度)[^，。；:：]{2,100}?" + ENDINGS + r")", subject):
            value = re.sub(r"^(\d{2,4}年(?:度|學年度)?)(?:核定|補助|辦理|推動)", r"\1", m.group(1))
            add(value)
        method = "inferred" if candidates else ""
    project = candidates[0] if len(candidates) == 1 else ""
    if len(candidates) > 1:
        hint = "主旨出現多個專案，請從下拉建議選擇或自行修正。"
    elif project:
        hint = "已從主旨擷取名稱，請核對是否為完整核定名稱。" if method == "quoted" else "此名稱由主旨推測，請特別核對名稱是否完整。"
    else:
        hint = "未找到明確專案名稱，請補截主旨或手動填寫。"
    if "特殊需求學生發所與輔導" in raw_subject:
        hint += " 已依專案用語將「發所」校正為「發掘」，請對照截圖確認；辨識原文仍保留於文字區。"
    if "學前階段巡迴輔導教師巡迴了服務交通費" in raw_subject:
        hint += " 已依專案用語將「巡迴了服務」校正為「巡迴服務」，請對照截圖確認；辨識原文仍保留於文字區。"
    return {"project": fullwidth_punctuation(project), "date": day, "number": fullwidth_punctuation(n.group(1) if n else ""), "subject": fullwidth_punctuation(subject), "candidates": list(map(fullwidth_punctuation, candidates)), "hint": hint, "engine": "python", **parse_approved_amount(flat)}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass  # 不記錄公文內容。

    def send_json(self, status, value):
        body = json.dumps(value, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def allowed(self):
        expected = f"127.0.0.1:{self.server.server_port}"
        return self.headers.get("Host") == expected and self.headers.get("Origin", "http://" + expected) == "http://" + expected

    def do_GET(self):
        if not self.allowed():
            return self.send_json(403, {"error": "僅接受本機工具請求"})
        if self.path == "/api/health":
            return self.send_json(200, {"service": "surplus-document-parser", "engine": "python"})
        if self.path != "/":
            return self.send_json(404, {"error": "找不到此頁面"})
        html = (ROOT / "賸餘款簽辦工具.html").read_text(encoding="utf-8")
        html = html.replace("</head>", '<script>document.documentElement.dataset.pythonApi="true";</script></head>')
        body = html.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if not self.allowed():
            return self.send_json(403, {"error": "僅接受本機工具請求"})
        if self.path != "/api/extract":
            return self.send_json(404, {"error": "找不到此功能"})
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= 200000:
                return self.send_json(413, {"error": "文字過長或內容空白"})
            payload = json.loads(self.rfile.read(length))
            text = payload.get("text") if isinstance(payload, dict) else None
            if not isinstance(text, str) or len(text) > 30000:
                raise ValueError()
        except (ValueError, UnicodeError):
            return self.send_json(400, {"error": "公文文字格式錯誤"})
        self.send_json(200, parse_document(text))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--no-open", action="store_true")
    parser.add_argument("--port", type=int, default=18766)
    args = parser.parse_args()
    try:
        server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    except OSError:
        raise SystemExit("Port is in use. Close the previous tool window and retry.")
    url = f"http://127.0.0.1:{args.port}/"
    print(f"Tool running: {url}\nClose this window to stop.", flush=True)
    if not args.no_open:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
