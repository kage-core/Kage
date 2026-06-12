🌐 [English](../README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Português (Brasil)](README.pt-BR.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · हिन्दी

<div align="center">

# Kage

### कोडिंग एजेंट्स के लिए सत्यापित रिपॉज़िटरी ज्ञान

हर दावा आपके मौजूदा कोड के हवाले से प्रमाणित होता है — और आप ठीक-ठीक देख सकते
हैं कि यह आपका कितना बचाता है। Kage ऐसी मेमोरी को अस्वीकार करता है जो
अस्तित्वहीन फ़ाइलों का हवाला देती है, जिसके प्रमाण मिटा दिए गए हों उसे रोक
लेता है, और जिस क्षण आपके बदलाव टीम के ज्ञान को अमान्य करते हैं, आपको चेतावनी
देता है। आपकी रिपॉज़िटरी में सादी फ़ाइलें, जिनकी समीक्षा कोड के साथ उसी PR में
होती है। न API key, न डेटाबेस, न कोई डेमन।

<p>
  <a href="https://kage-core.github.io/Kage/">वेबसाइट</a>
  ·
  <a href="https://kage-core.github.io/Kage/guide.html">दस्तावेज़</a>
  ·
  <a href="https://kage-core.github.io/Kage/viewer/">व्यूअर</a>
  ·
  <a href="https://www.npmjs.com/package/@kage-core/kage-graph-mcp">npm</a>
</p>

<p>
  <a href="https://www.npmjs.com/package/@kage-core/kage-graph-mcp"><img src="https://img.shields.io/npm/v/@kage-core/kage-graph-mcp?color=41ff8f&label=npm" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@kage-core/kage-graph-mcp"><img src="https://img.shields.io/npm/dm/@kage-core/kage-graph-mcp?color=41ff8f" alt="downloads"></a>
  <img src="https://img.shields.io/npm/l/@kage-core/kage-graph-mcp?color=41ff8f" alt="license">
  <img src="https://img.shields.io/badge/trust%20benchmark-100%2F100-41ff8f" alt="trust 100/100">
</p>

**इनके साथ काम करता है** Claude Code · Codex · Cursor · Windsurf · Gemini CLI · Cline ·
Goose · Roo Code · Kilo Code · OpenCode · Aider · Claude Desktop · कोई भी MCP क्लाइंट

</div>

---

## देखिए आपकी रिपॉज़िटरी क्या छिपा रही है — 60 सेकंड, शून्य सेटअप

```bash
npx -y @kage-core/kage-graph-mcp scan --project .
```

**Truth Report** (सत्य रिपोर्ट) डुप्लिकेट इम्प्लीमेंटेशन, घोस्ट एक्सपोर्ट,
बस-फ़ैक्टर-1 वाली संवेदनशील फ़ाइलें, ज्ञान-रिक्तियाँ और दस्तावेज़ों के झूठ
खोज निकालती है। Express के ताज़ा क्लोन पर:

```text
Kage Truth Report — express
Scanned 142 files, 3160 symbols, 1 doc file(s)

■ KNOWLEDGE VOID — high churn, zero memory (7, showing top 4)
  • lib/response.js — knowledge void
    390 commits of accumulated decisions, 149 graph edge(s) depending on it —
    and zero memory packets or doc mentions. Agents and new hires fly blind here.
  • lib/application.js — 179 commits x 77 edges, memory packets citing it: 0
  • lib/request.js     — 175 commits x 58 edges, memory packets citing it: 0
  • lib/utils.js       — 107 commits x 35 edges, memory packets citing it: 0
```

हर निष्कर्ष *आपके अपने* कोड से `file:line` प्रमाण का हवाला देता है — कुछ भी
जनरेट नहीं किया गया है।

## 30 सेकंड का ट्रस्ट डेमो

```bash
npx -y @kage-core/kage-graph-mcp demo
```

```text
1. Hallucinated citation — REJECTED on write:
   ✗ "Use the helper in src/ghost.ts"
     Citation validation failed: none of the referenced paths exist in this repo.

2. Stale memory (cited file deleted) — WITHHELD from recall:
   ⊘ Legacy retry helper is the fallback
     all cited files deleted since capture: src/legacy-retry.ts

3. Recall returns only grounded, current memory:
   ✓ Payments must be idempotent
   ✓ Auth uses jose, not jsonwebtoken
```

## रसीदें, अंदाज़े नहीं

Kage हर रिपॉज़िटरी के लिए एक वैल्यू लेजर रखता है और दिखाता है कि मेमोरी हार्नेस
ने वास्तव में क्या किया। `kage gains --project .`:

```text
This week Kage saved you ~564K tokens (~$8.46), blocked 0 stale memories,
caught 0 stale at change-time, answered 2 recalls.
```

एजेंट हर रिकॉल के बाद वही रसीद आगे पहुँचाते हैं, और व्यूअर उसी लेजर से चलने
वाले Gains टैब से शुरू होता है — हर संख्या किसी लॉग किए गए इवेंट तक खोजी जा
सकती है।

## विश्वास की कार्यप्रणाली

गलत मेमोरी पर काम करने वाला एजेंट, बिना मेमोरी वाले एजेंट से भी बुरा है।
Kage तीन बिंदुओं पर विश्वास लागू करता है:

1. **लिखते समय अस्वीकार** — आपकी रिपॉज़िटरी में मौजूद न होने वाली फ़ाइलों का
   हवाला देने वाली मेमोरी ठुकरा दी जाती है। हैलुसिनेटेड हवाले कभी स्टोरेज में
   नहीं पहुँचते।
2. **रिकॉल पर रोक** — हर रिकॉल हवाले में दी गई फ़ाइलों को दोबारा सत्यापित करता
   है। यदि प्रमाण मिटा दिया गया हो, TTL समाप्त हो गई हो, या मेमोरी को बासी
   (stale) रिपोर्ट किया गया हो, तो उसे दबा दिया जाता है (और व्यूअर में आपको
   दिखाया जाता है — चुपचाप कभी नहीं हटाया जाता)।
3. **बदलाव के समय stale-पकड़** — `kage pr check` (और pre-commit हुक के रूप में
   `kage staleguard`) सबसे पहले यह बताता है कि आपके diff ने अभी क्या तोड़ा:

   ```text
   ⚠ Your changes invalidated 15 team memories:
     • CI: Kage PR Check must block only on hard-stale memory — cites mcp/kernel.ts (file changed)
     fix: kage learn (update) | kage supersede --packet <id>
   ```

और ऊपर से एक गोपनीयता गारंटी: कुछ भी `<private>…</private>` में लपेट दें और
Kage उसे कभी स्टोर नहीं करेगा — कोई भी packet या ऑब्ज़र्वेशन डिस्क तक पहुँचने
से पहले वह हिस्सा `[private]` से बदल दिया जाता है।

सेशन लूप अपना ख़याल खुद रखता है: यदि एजेंट ने कुछ भी कैप्चर नहीं किया, तो सेशन
की ऑब्ज़र्वेशन सेशन के अंत में **स्वतः लंबित ड्राफ़्ट में आसवित** हो जाती हैं
(समीक्षा आप करते हैं, आँख मूँदकर भरोसा कभी नहीं); अगला सेशन एक **"पिछली
बार…" डाइजेस्ट** (`kage resume`) से खुलता है; व्यूअर मेमोरी इवेंट्स को घटित
होते ही **लाइव** स्ट्रीम करता है; और जब कुछ टूटता है, तो **`kage repair`** एक
ही कमांड में बैकअप, मरम्मत और पुनर्निर्माण कर देता है।

अपनी ही रिपॉज़िटरी पर साबित करें: `kage benchmark --trust --project .`
हैलुसिनेशन अस्वीकृति, stale बहिष्करण और लाइव ग्राउंडिंग मापता है — 100/100।

## आँकड़े

- वास्तविक कोड-नेविगेशन कार्यों पर **समान शुद्धता के साथ grep से 18% तेज़**
  (N=3 टास्क सूट, वही एजेंट, वही मॉडल;
  `kage benchmark --project . --compare --task "<task>"` से दोहराएँ)।
- import-सजग कॉल रिज़ॉल्यूशन के बाद **Express पर 524 घोस्ट कॉल एज → 0**:
  कॉल किए गए फ़ंक्शन पहले लोकल स्कोप → imports → पैकेज से रिज़ॉल्व होते हैं,
  उसके बाद ही केवल-नाम मिलान होता है, और बाहरी पैकेजों के import रिपॉज़िटरी
  में कोई एज नहीं बनाते।
- tree-sitter परत (शुद्ध WASM, शून्य नेटिव निर्भरता) के ज़रिए Python, Go,
  Rust, Java और Ruby के लिए **वास्तविक AST निष्कर्षण** — Click पर 466 मेथड
  सही वर्गीकृत हुए, जहाँ regex निष्कर्षण को 0 मिले थे।
- **LongMemEval-S रिट्रीवल**: शून्य निर्भरताओं के साथ 96.17% R@5 / 98.72% R@10।

कार्यप्रणाली, कमांड और सीमाएँ: [docs/BENCHMARKS.md](../docs/BENCHMARKS.md)।

## जब मेमोरी टूल पहले से मौजूद हैं, तो Kage क्यों

सब-कुछ-कैप्चर करने वाली मेमोरी ([claude-mem](https://github.com/thedotmack/claude-mem),
mem0, Zep) *याद रखने* की समस्या हल करती है। Kage *याद रखे गए पर भरोसे* की
समस्या हल करता है: हर मेमोरी उस कोड से जाँची जाती है जिसका वह हवाला देती है —
लिखते समय, रिकॉल के समय, और जब आपका diff उसके नीचे का कोड बदलता है।

| | Kage | claude-mem | mem0 / Zep |
|---|---|---|---|
| स्वचालित कैप्चर + सेशन शुरू होते ही रिकॉल | ✓ | ✓ | SDK के ज़रिए |
| हैलुसिनेटेड हवाले **लिखते समय अस्वीकृत** | ✓ | — | — |
| बासी मेमोरी **रिकॉल पर रोकी जाती है** (प्रमाण बदला/मिटा) | ✓ | — | — |
| **diff-समय stale-पकड़** — आपका बदलाव किसी मेमोरी को अमान्य करे, तो PR से पहले चेतावनी | ✓ | — | — |
| मेमोरी की समीक्षा git में, कोड के साथ उसी PR में (सादी फ़ाइलें, कोई DB नहीं) | ✓ | SQLite + क्लाउड | होस्टेड API |
| बचत की रसीदें (प्रति रिकॉल टोकन + $, वैल्यू लेजर) | ✓ | टोकन इंडेक्स | — |
| किसी भी रिपॉज़िटरी पर Truth Report, शून्य सेटअप | ✓ | — | — |
| खाता / API key आवश्यक | नहीं | क्लाउड वैकल्पिक | हाँ |

जो मेमोरी सिस्टम अपने ही दावों को कभी दोबारा सत्यापित नहीं करता, वह जितना
ज़्यादा इस्तेमाल होता है उतना *कम* भरोसेमंद होता जाता है। Kage वह है जो समय
के साथ निखरता है।

## त्वरित शुरुआत

Node.js 18+ चाहिए। अपनी रिपॉज़िटरी के अंदर से एक कमांड:

```bash
npx -y @kage-core/kage-graph-mcp install
```

यह `.agent_memory/` बनाता है, कोड ग्राफ़ तैयार करता है, आपके एजेंट्स
(Claude Code, Codex, Cursor, Windsurf, Gemini CLI, OpenCode, Goose, Aider) को
स्वतः पहचानकर जोड़ देता है। या ग्लोबल इंस्टॉल करके एजेंट एक-एक करके जोड़ें:

```bash
npm install -g @kage-core/kage-graph-mcp
cd your-repo
kage install                   # or: kage init --project . for memory only
```

या किसी एजेंट को मैन्युअल रूप से जोड़ें (एक कमांड MCP + hooks कॉन्फ़िग लिख
देती है):

```bash
kage setup claude-code --project . --write     # Claude Code
kage setup codex       --project . --write     # Codex
kage setup cursor      --project . --write     # Cursor
kage setup windsurf    --project . --write     # Windsurf
# also: gemini-cli, cline, goose, roo-code, kilo-code, opencode, aider,
#       claude-desktop, generic-mcp — see: kage setup list
```

Claude Code / Codex उपयोगकर्ता इसके बजाय प्लगइन इंस्टॉल कर सकते हैं:

```bash
/plugin marketplace add kage-core/Kage      # then: /plugin install kage@kage
codex plugin marketplace add kage-core/Kage # then: codex plugin add kage@kage
```

एजेंट को एक बार रीस्टार्ट करें, फिर पुष्टि करें कि हार्नेस सक्रिय है:

```bash
kage setup verify-agent --agent claude-code --project .
```

यहाँ से सब कुछ सहज रूप से चलता है: एजेंट कार्य शुरू होते ही आधार-युक्त मेमोरी
रिकॉल करता है (`kage_context`), काम करते-करते टिकाऊ सीखें कैप्चर करता है
(`kage_learn`), और आप मेमोरी की समीक्षा कोड वाले उसी PR में करते हैं।
`kage refresh` मर्ज के बाद फिर से ग्राउंड करता है; `kage viewer` लाभ, विश्वास
और रोकी गई मेमोरी दिखाता है।

## packet का जीवनचक्र

हर सीख एक **packet** है: `.agent_memory/packets/` में समीक्षा-योग्य JSON,
git-ट्रैक्ड और diff-योग्य।

**कैप्चर → हवाला-जाँच** (अस्तित्वहीन पाथ अस्वीकार) **→ ग्राउंडिंग**
(हवाले वाली फ़ाइलों का फ़िंगरप्रिंट) **→ रिकॉल** (बासी मेमोरी बहिष्कृत)
**→ रिफ़्रेश** (कोड बदलने पर ग्राउंडिंग का पुनर्सत्यापन)
**→ अपडेट / प्रतिस्थापन / सेवानिवृत्ति**।

packet तब बासी होता है जब कोई हवाले वाली फ़ाइल गायब हो या सत्यापन के बाद बदल
गई हो, उसकी TTL (365 दिन) समाप्त हो गई हो, या उसे रिपोर्ट/पदावनत किया गया हो।
सॉफ़्ट-stale (जुड़ा कोड बदला) समीक्षा के लिए चिह्नित होता है; हार्ड-stale
(प्रमाण गायब) रिकॉल से रोक दिया जाता है। `kage compact` मृत हवालों की छँटाई
कर डुप्लिकेट सामने लाता है; `kage supersede` तब वंशावली दर्ज करता है जब एक
मेमोरी दूसरी की जगह लेती है।

## रोज़मर्रा की कमांड

```bash
kage recall "how do I run tests" --project .
kage code-graph "who calls createPacket" --project .   # definition + call sites
kage verify --project .        # check citations against current code
kage pr check --project .      # stale-catch + graph freshness gate
kage gains --project .         # what Kage saved you
kage viewer --project .        # local dashboard
```

पूर्ण CLI और MCP संदर्भ: [दस्तावेज़](https://kage-core.github.io/Kage/guide.html)।

## स्टोरेज

सब कुछ `.agent_memory/` में रहता है: `packets/` टिकाऊ रिपॉज़िटरी मेमोरी है
(git-ट्रैक्ड JSON); `graph/`, `code_graph/`, `structural/` और `indexes/`
`kage refresh` से पुनर्निर्मित किए जा सकते हैं; `reports/` में वैल्यू लेजर और
हेल्थ रिपोर्ट रहती हैं। कैप्चर लिखने से पहले सीक्रेट और निजी जानकारी (PII)
स्कैन करता है।

## विकास

```bash
cd mcp
npm install
npm test
npm run build
```

## लाइसेंस

GPL-3.0-only। देखें [LICENSE](../LICENSE)। GPL पर जाने से पहले के रिलीज़ MIT
के अंतर्गत थे।
