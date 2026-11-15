<h1 align="center">Anatomy</h1>

<p align="center"><a href="README.md">English</a> · Türkçe</p>

<p align="center"><b>Bir fikri, onu gerçek ve çalışan bir nesne olarak inşa ederek anlatan bir Claude becerisi (skill).</b><br>Antigravity, OpenCode, Codex ve MiniMax Code'da da çalışır.<br>SVG, WebGL ve 3D olarak, çok sayıda küçük ve hassas parçadan oluşan, özenle işlenmiş, etkileşimli izometrik figürler.</p>

<p align="center">
  <a href="https://code.claude.com/docs/en/skills"><img src="https://img.shields.io/badge/Claude_Code-skill-1b1b19?style=flat-square&logo=claude&logoColor=white" alt="Claude Code becerisi"></a>
  <a href="https://agentskills.io"><img src="https://img.shields.io/badge/Agent_Skills-compatible-1b1b19?style=flat-square" alt="Agent Skills uyumlu"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-1b1b19?style=flat-square" alt="MIT lisansı"></a>
  <a href="#gereksinimler"><img src="https://img.shields.io/badge/node-%E2%89%A5%2020.10-1b1b19?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node 20.10 veya üzeri"></a>
  <a href="#gereksinimler"><img src="https://img.shields.io/badge/dependencies-0-1b1b19?style=flat-square" alt="Bağımlılık yok"></a>
  <a href="https://github.com/wheresryan22/anatomy/actions/workflows/ci.yml"><img src="https://github.com/wheresryan22/anatomy/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
</p>

<p align="center">
  <a href="https://skills.wheresryan.sh/anatomy"><img src="https://img.shields.io/badge/Website-skills.wheresryan.sh%2Fanatomy-1b1b19?style=for-the-badge" alt="Web sitesi: skills.wheresryan.sh/anatomy"></a>
  &nbsp;
  <a href="https://github.com/wheresryan22/anatomy/archive/refs/heads/main.zip"><img src="https://img.shields.io/badge/Download-ZIP-1b1b19?style=for-the-badge&logo=github&logoColor=white" alt="ZIP olarak indir"></a>
  &nbsp;
  <a href="#kurulum"><img src="https://img.shields.io/badge/Install-npx_skills_add-d7d7d0?style=for-the-badge&labelColor=1b1b19&logo=npm&logoColor=white" alt="npx ile kur"></a>
</p>

<p align="center">
  <a href="#hızlı-başlangıç">Hızlı başlangıç</a> ·
  <a href="#galeri">Galeri</a> ·
  <a href="#neler-yapar">Neler yapar</a> ·
  <a href="#kurulum">Kurulum</a> ·
  <a href="#kullanım">Kullanım</a> ·
  <a href="#örnekler">Örnekler</a> ·
  <a href="#nasıl-çalışır">Nasıl çalışır</a> ·
  <a href="#sınırlar">Sınırlar</a>
</p>

<p align="center">
  <img src=".github/assets/raptor-engine-firing.webp" width="640" alt="Bir test sehpasında asılı duran ve ateşlenen Raptor 2 roket motorunun izometrik çizimi: WebGL shader'ıyla çizilen kırmızı bir egzoz alevi sehpanın taban plakasına dökülüyor. Kartta Fig 1, Raptor 2 test stand, Pc 300 bar, 230 tf yazıyor.">
</p>

<p align="center"><sub><code>examples/raptor-engine</code>, açık tema, ateşleme anı. Motor ve sehpa SVG; alev, aynı izometrik kamerada çalışan bir WebGL shader'ı.</sub></p>

---

Claude'dan teknik bir fikri anlatan bir figür iste; Anatomy ona, çalışma şekli o kavramın *ta kendisi* olan fiziksel bir nesne icat ettirir. Hiçbir şey değişmediğinde işi atlayan bir önbellek anahtarı (cache key), ancak bütün pimler eşleştiğinde dönen pimli bir kilide dönüşür. Birçok canvas'a hizmet eden tek bir GPU bağlamı, tek baskı kafası 16 hazneyi tek tek ziyaret eden bir portal çiziciye dönüşür.

Sonra Claude o nesneyi düzinelerce küçük, katı, gölgelendirilmiş parçadan inşa eder; onu başlığı, ipucu ve canlı göstergesi olan çerçeveli bir karta yerleştirir; fare imleci ve klavyeyle sakin bir şekilde hareket etmesini sağlar ve her eklem yerine yakınlaşarak kendi işini kontrol eder. Figürün gösterdiği her sayı, parçalarını hareket ettiren aynı küçük modelden gelir.

## Hızlı başlangıç

```sh
npx skills add wheresryan22/anatomy -g
```

CLI hangi ajanların kurulacağını sorar (Claude Code, Antigravity, OpenCode, Codex, MiniMax Code). Soruyu atlamak için `-a claude-code`, `-a antigravity`, `-a opencode`, `-a codex` ya da `-a minimax-code` ekle.

Sonra Claude Code'da:

```text
/anatomy explain how a token bucket rate limiter works, interactive
```

Antigravity, OpenCode, Codex veya MiniMax Code için o ajanı hedefle: `-a antigravity`, `-a opencode`, `-a codex` ya da `-a minimax-code`. Antigravity, OpenCode ve MiniMax Code aynı `/anatomy` komutunu kullanır; Codex'te `$anatomy` yaz.

Hepsi bu. API anahtarı yok, `npm install` ile kurulacak bir şey yok: kit yalnızca Node'un yerleşik modüllerini kullanır.

## Galeri

<table>
  <tr>
    <td width="50%"><img src=".github/assets/raptor-engine-apart.webp" alt="Test sehpasında parçalarına ayrılmış Raptor 2 motoru: montaj grupları, boruları ve kablo demeti sehpanın direkleri arasında birbirinden ayrı asılı duruyor."></td>
    <td width="50%"><img src=".github/assets/ripple-tank.webp" alt="Dört uzun ayak üzerinde, üstünde bir kola bağlı lamba olan bir okul dalga tankı. Titreşen bir çubuk üzerindeki iki daldırıcı girişim yapan dalgalar oluşturuyor ve bunların kostikleri tankın altındaki kâğıt ekrana yansıyor."></td>
  </tr>
  <tr>
    <td><sub><b>raptor-engine</b>: üzerine gel, 11 montaj grubuna ayrılsın. Bir denetim (audit), hiçbir borunun hiçbir şeyin içinden geçmediğini kanıtlar: dururken, ayrıyken ve aradaki her karede.</sub></td>
    <td><sub><b>ripple-tank</b>: bir dağılım (dispersiyon) ve optik modeliyle çalışan, iki WebGL katmanı üzerinde SVG düzenek (kâğıtta lamba ışığı ve kostikler, suda yansımalar).</sub></td>
  </tr>
  <tr>
    <td><img src=".github/assets/turning-dial.webp" alt="Yükseltilmiş bir kapı plakası üzerinde şifreli bir kadran. Küçük, altın ve krom bir robot eli kadranın üzerinde yatıyor ve onunla birlikte dönüyor; bir parmak ucunun altında yeşil bir ışık parlıyor."></td>
    <td><img src=".github/assets/dial-indicator.webp" alt="Cetvel şeritli bir taban plakasının üzerinde, sehpaya takılı bir komparatör saati. Pistonu, kayan bir taşıyıcı üzerindeki üç mastar bloğundan birine dayanıyor."></td>
  </tr>
  <tr>
    <td><sub><b>turning-dial</b>: 3D modu (beta). Kadranı sürükledikçe yaklaşık 90 parça her karede yeniden yansıtılır ve yeniden gölgelendirilir.</sub></td>
    <td><sub><b>dial-indicator</b>: en küçük örnek, yaklaşık 300 satır. Taşıyıcıyı kaydırmak için üzerine gel; ibre her bloğu okur.</sub></td>
  </tr>
</table>

Her ekran görüntüsü, [`examples/`](examples) içindeki bir sayfanın açık temasıdır ve becerinin kendi [`scripts/capture.mjs`](scripts/capture.mjs) ve [`scripts/drive.mjs`](scripts/drive.mjs) betikleriyle alınmıştır. Derlenmiş sayfalar repoda: denemek için `examples/` içindeki herhangi bir `.html` dosyasını aç.

## Neler yapar

Üç tür figür. Üçü de aynı kiti, aynı kamerayı ve aynı işçilik kurallarını paylaşır.

| Tür | Nedir | Örnek |
|---|---|---|
| **SVG** | Çekirdek. Dört tonlu gölgelendirmeye sahip, arkadan öne boyanan katı izometrik parçalar; canlı göstergesi ve yumuşatılmış hareketi olan bir kartta. Bağımsız bir HTML sayfası, stilleri gömülü tek bir `.svg` dosyası ya da React/Next.js bileşenleri olarak gelir. | `dial-indicator`, `desk-computer`, `arcade-cabinet`, `test-rig` |
| **SVG + WebGL** | Çizgilerin çizemedikleri için: ateş, egzoz, su, kostikler, lamba ışığı, parıltı, buhar. Shader, arka ve ön SVG arasındaki bir canvas'ta, figürün kendi izometrik kamerasında çalışır; böylece çizimin içinde durur. SVG, WebGL olmadan da okunur. | `raptor-engine`, `ripple-tank` |
| **3D** <sup>beta</sup> | Gerçek 3D'de dönen parçalar: dönen bir kadran ya da döner tabla, bükülen parmaklar, kopup düşen bir parça. Hareketli parçalar her karede kitin kendi kurallarıyla yeniden yansıtılır ve gölgelendirilir; figürün geri kalanı durağan çizim olarak kalır. | `turning-dial` |

Her figür açık ya da koyu temalıdır. Beceri önce açık tema için tasarlar, shader'lar dahil.

## Kurulum

Anatomy standart bir [Agent Skill](https://agentskills.io)'dir: kökünde bir `SKILL.md` bulunan bir klasör. Bu repo o klasördür. Bir yol seç:

| | Komut | Kurulduğu yer |
|---|---|---|
| **skills CLI**, kendin için (Claude Code) | `npx skills add wheresryan22/anatomy -g -a claude-code` | `~/.claude/skills/anatomy` |
| **skills CLI**, kendin için (Antigravity) | `npx skills add wheresryan22/anatomy -g -a antigravity` | `~/.gemini/antigravity/skills/anatomy` |
| **skills CLI**, kendin için (OpenCode) | `npx skills add wheresryan22/anatomy -g -a opencode` | `~/.config/opencode/skills/anatomy` |
| **skills CLI**, kendin için (Codex) | `npx skills add wheresryan22/anatomy -g -a codex` | `~/.agents/skills/anatomy` |
| **skills CLI**, kendin için (MiniMax Code) | `npx skills add wheresryan22/anatomy -g -a minimax-code` | `~/.minimax/skills/anatomy` |
| **skills CLI**, tek bir proje için | `npx skills add wheresryan22/anatomy` | Claude Code için `.claude/skills/anatomy`; Antigravity, OpenCode ve Codex için `.agents/skills/anatomy`; MiniMax Code için `.minimax/skills/anatomy` |
| **git**, kendin için (Claude Code) | `git clone https://github.com/wheresryan22/anatomy.git ~/.claude/skills/anatomy` | `~/.claude/skills/anatomy` |
| **git**, kendin için (Antigravity) | `git clone https://github.com/wheresryan22/anatomy.git ~/.gemini/antigravity/skills/anatomy` | `~/.gemini/antigravity/skills/anatomy` |
| **git**, kendin için (OpenCode) | `git clone https://github.com/wheresryan22/anatomy.git ~/.config/opencode/skills/anatomy` | `~/.config/opencode/skills/anatomy` |
| **git**, kendin için (Codex) | `git clone https://github.com/wheresryan22/anatomy.git ~/.agents/skills/anatomy` | `~/.agents/skills/anatomy` |
| **git**, kendin için (MiniMax Code) | `git clone https://github.com/wheresryan22/anatomy.git ~/.minimax/skills/anatomy` | `~/.minimax/skills/anatomy` |
| **git**, tek bir proje için | `git clone https://github.com/wheresryan22/anatomy.git .claude/skills/anatomy` | `.claude/skills/anatomy` (Claude Code ve OpenCode) ya da `.agents/skills/anatomy` (Antigravity, OpenCode, Codex ve MiniMax Code) |
| **İndirme**, git olmadan | aşağıya bak | yukarıdaki klasörlerden herhangi biri |

<details>
<summary><b>skills CLI ile</b></summary>

<br>

[`skills`](https://github.com/vercel-labs/skills) CLI'ı bu reponun kökündeki `SKILL.md`'yi bulur ve onu `anatomy` olarak kurar. Varsayılan olarak mevcut projeye kurar ve hangi ajanların kurulacağını sorar. `-g` kendi kullanıcın için kurar, `-a claude-code` yalnızca Claude Code'u kurar. Yalnızca Antigravity, OpenCode, Codex veya MiniMax Code için `-a antigravity`, `-a opencode`, `-a codex` ya da `-a minimax-code` kullan.

CLI, örnekler dahil reponun tamamını kopyalar (yaklaşık 10 MB). Yeni bir Node.js gerekir: CLI'ın 1.7.1 sürümü 22.20 veya üzerini istiyor.

</details>

<details>
<summary><b>git ile</b></summary>

<br>

Repoyu beceri klasörlerinden birine klonla; böylece `SKILL.md` `<beceri klasörü>/anatomy/SKILL.md` konumunda olur. Claude Code için `~/.claude/skills/anatomy` ya da `.claude/skills/anatomy` kullan. Antigravity için `~/.gemini/antigravity/skills/anatomy` ya da `.agents/skills/anatomy` kullan. OpenCode için `~/.config/opencode/skills/anatomy` ya da `.opencode/skills/anatomy` kullan; OpenCode ayrıca Claude Code ve `.agents` klasörlerini de okur. Codex için `~/.agents/skills/anatomy` ya da `.agents/skills/anatomy` kullan. MiniMax Code için `~/.minimax/skills/anatomy` (veri klasörünü taşıdıysan `$MINIMAX_DATA_DIR/skills/anatomy`) ya da `.minimax/skills/anatomy` kullan; MiniMax Code ayrıca Claude Code, Codex ve `.agents` klasörlerini de okur. Proje kurulumunda klasörü commit'le ki ekibin de alsın. Daha sonra güncellemek için o klasörün içinde `git pull` çalıştır.

</details>

<details>
<summary><b>git olmadan indirme</b></summary>

<br>

[ZIP'i indir](https://github.com/wheresryan22/anatomy/archive/refs/heads/main.zip), aç, klasörün adını `anatomy-main`'den `anatomy`'ye çevir ve onu `~/.claude/skills/` (Claude Code), `~/.gemini/antigravity/skills/` (Antigravity), `~/.config/opencode/skills/` (OpenCode), `~/.agents/skills/` (Codex) ya da `~/.minimax/skills/` (MiniMax Code) içine taşı.

Ya da macOS veya Linux'ta tek satırda:

```sh
mkdir -p ~/.claude/skills/anatomy && curl -L https://github.com/wheresryan22/anatomy/archive/refs/heads/main.tar.gz | tar -xz --strip-components=1 -C ~/.claude/skills/anatomy
```

Antigravity, OpenCode, Codex veya MiniMax Code için aynı dosyaları `~/.gemini/antigravity/skills/anatomy`, `~/.config/opencode/skills/anatomy`, `~/.agents/skills/anatomy` ya da `~/.minimax/skills/anatomy` içine koy:

```sh
mkdir -p ~/.gemini/antigravity/skills/anatomy && curl -L https://github.com/wheresryan22/anatomy/archive/refs/heads/main.tar.gz | tar -xz --strip-components=1 -C ~/.gemini/antigravity/skills/anatomy
```

```sh
mkdir -p ~/.config/opencode/skills/anatomy && curl -L https://github.com/wheresryan22/anatomy/archive/refs/heads/main.tar.gz | tar -xz --strip-components=1 -C ~/.config/opencode/skills/anatomy
```

</details>

Claude Code yeni becerileri çalışan bir oturumda algılar. Oturum başladığında `skills` klasörünün kendisi yoksa `/reload-skills` çalıştır. Antigravity ve OpenCode onu sohbetlerinde `/anatomy` olarak listeler; görünmezse yeniden başlat. Codex onu `/skills` altında listeler ve `$anatomy` ile çalıştırır; görünmezse Codex'i yeniden başlat. MiniMax Code onu `/anatomy` olarak listeler; görünmezse `mcode`'u yeniden başlat.

<details>
<summary><b>Codex: tarayıcı kontrolleri engellenirse</b></summary>

<br>

Beceri kendi figürlerini başsız (headless) Chrome başlatarak kontrol eder; Chrome geçici bir profil yazar ve yerel bir port üzerinden onunla konuşur. Codex komutları bir sandbox içinde çalıştırır ve bu sandbox Chrome'u durdurabilir. Figür yine de oluşturulur; yalnızca kontrolleri başarısız olur. Tercih sırasına göre:

1. Codex bir kontrolü sandbox dışında çalıştırmak için izin istediğinde, o komut için onayla. Bunun için varsayılan `approval_policy = "on-request"` ayarı gerekir.
2. Ya da `~/.codex/config.toml` içinde bir kez izin ver:

   ```toml
   approval_policy = "on-request"
   sandbox_mode = "workspace-write"

   [sandbox_workspace_write]
   network_access = true
   writable_roots = ["/tmp"]
   ```

   Yeni Codex sürümleri bu ayarlara farklı adlar verebilir; kendi sürümünün yapılandırma başvurusuna bak.
3. Ya da kontrolü normal bir terminalde kendin çalıştır, örneğin `node scripts/capture.mjs page.html --out shots/page.png`.

Codex'i `--sandbox danger-full-access` ile başlatmak da işe yarar, ama o oturum için her sınırı kaldırır; bu yüzden onu güvendiğin projelere sakla.

</details>

## Kullanım

`/anatomy` yaz (Codex'te `$anatomy`) ve figürün neyi anlatması gerektiğini söyle:

```text
/anatomy explain how a token bucket rate limiter works, interactive
```

Becerinin adını söylemek zorunda değilsin. İzometrik bir illüstrasyon; belgeler, bir blog yazısı ya da bir açılış sayfası için açıklayıcı bir figür veya etkileşimli bir açıklama istediğinde Claude onu kendisi de yükler. Antigravity, OpenCode, Codex ve MiniMax Code da aynısını yapar.

<details>
<summary><b>Daha fazla istem</b>, becerinin <a href="evals/evals.json">değerlendirmelerinden</a></summary>

<br>

```text
/anatomy a figure for our Next.js docs on database connection pooling: a pool of 10 connections, requests borrow one and give it back, and when all 10 are busy new requests wait in a queue. A React component plus a static HTML preview, dark theme.
```

```text
/anatomy an isometric SVG explaining how a CDN edge cache works, cache hit vs miss, TTL of 60 s, for a dark landing page. Just the SVG file and a PNG preview.
```

```text
/anatomy a Bunsen burner on a lab bench: opening the air collar turns the lazy yellow flame into a roaring blue cone. WebGL for the flame, one HTML file, dark theme.
```

```text
/anatomy a heat-exchanger espresso machine with the side panel off: boiler, heat-exchanger tube, group head, pump, steam wand and gauge. Show the water flowing when you pull a shot. Standalone HTML, light theme.
```

</details>

En iyi figürleri üç alışkanlık getirir:

1. **Çizimi değil, fikri söyle.** Neyi anlatması gerektiğini söyle ve gerçek sayıları ver (boyutlar, adetler, oranlar, eşikler). Nesneyi Anatomy icat eder; işin büyük kısmı budur ve bunu kutu ve ok tarifinden daha iyi yapar.
2. **Ya da nesneyi söyle.** İstediğin makineyi zaten biliyorsan (bir espresso makinesi, bir Bunsen beki, bir kilit) söyle ve neyin hareket etmesi gerektiğini belirt.
3. **Nerede duracağını söyle.** Bağımsız bir HTML sayfası, tek bir SVG dosyası ya da bir React/Next.js bileşeni; açık ya da koyu. Her biri için derleme farklıdır.

Bir figür, sahibi olduğun kaynak kod olarak gelir: bir Node derleme betiği ve onun yazdığı sayfa; React için ise geometri modülleri, durağan çizim için bir sunucu bileşeni ve hareket için tek bir istemci bileşeni. Kit de onunla birlikte gelir.

## Örnekler

Framework kullanmayan her örneğin, kendi yanına bağımsız sayfalar yazan bir Node derleme betiği var. Açık tema için `--light` ekle.

| Örnek | Ne gösterir | Derleme |
|---|---|---|
| [`dial-indicator`](examples/dial-indicator) | Mastar blokları taşıyan bir taşıyıcının üzerinde, sehpaya takılı bir komparatör saati. En küçük örnek, yaklaşık 300 satır. | `node examples/dial-indicator/build.mjs` |
| [`desk-computer`](examples/desk-computer) | Üzerinde yazı yazabileceğin klavyesiyle 1984 tarzı bir masaüstü bilgisayar. Yazılan satır, kasanın ön yüzü düzleminde çizilen bir CRT ekranda görünür; kapatınca görüntü bir çizgiye ve bir noktaya çöker. Yaklaşık 85 katı parça. | `node examples/desk-computer/build.mjs` |
| [`arcade-cabinet`](examples/arcade-cabinet) | Yan paneli açık, dik bir atari kabini. Bir jeton at: jeton kanalından jeton anahtarı telinin yanından geçerek kasaya yuvarlanır, kablo boyunca karta bir sinyal gider ve CRT ısınıp eğik monitörün düzleminde çizilen bir tanıtım moduna geçer. Yaklaşık 240 katı parça ve 15 kablo. | `node examples/arcade-cabinet/build.mjs` |
| [`raptor-engine`](examples/raptor-engine) | Test sehpasında bir Raptor 2 motoru. 11 montaj grubuna ayrılır; arka ve ön SVG arasında bir WebGL alevi, şok dalgası, sıçrama ve buhar render edilir. Yoğun boru tesisatı, yumuşak gölgelendirme, geçişler ve denetim için referans örnek. Derlemesi birkaç dakika sürer. | `node examples/raptor-engine/build.mjs` |
| [`ripple-tank`](examples/ripple-tank) | Kâğıt bir ekranın üzerinde uzun ayaklı bir okul dalga tankı, 44° yukarıdan görünüyor. İki WebGL katmanı izometrik düzlemlere hizalanmış ve `model.mjs` içindeki saf bir modelle çalışıyor. | `node examples/ripple-tank/build.mjs` |
| [`test-rig`](examples/test-rig) | Bir React/Next.js sitesinden üretimde kullanılan bir figür: yaylı bir taşıyıcı üzerinde cam bir düğme, ray üzerinde bir parmak ucu ve eğimi okuyan bir komparatör saati. 53 katı parça. Derleme betiği yok: bir React uygulamasına kopyala. | yok |
| [`spot-plate`](examples/spot-plate) | Aynı siteden ikinci bir figür: bir sentil yelpazesi açıldıkça bir damla plakası üzerindeki altı çift cam damla birleşip tek bir cam parçasına dönüşür. Her çift tek bir mesafe alanından çizilir. Derleme betiği yok: bir React uygulamasına kopyala. | yok |
| [`turning-dial`](examples/turning-dial) | 3D modu: üzerinde küçük bir robot eli olan, gerçek 3D'de dönen şifreli bir kadran; kalkan üç eklemli bir parmak ve serbest bir cisim olarak kopan bir parça. `stress.mjs`, performansı ölçmek için kullanılan, dağınık bir atölyedeki 380 parçalı bir eldir. | `node examples/turning-dial/build.mjs` |

Raptor ve atari kabini yazdırılabilir de. `node scripts/print.mjs examples/raptor-engine/sheet.mjs --format all`, derlenmiş açık tema sayfasından üç A4 PDF yazar: tek sayfalık bir poster, tek sayfalık bir teknik çizim ve iki sayfalık ayrıntılı bir açıklama. Herhangi bir figürün yazdırılabilir sürümünü iste, Anatomy onun `sheet.mjs` dosyasını yazsın; bkz. [`references/print.md`](references/print.md).

`node examples/raptor-engine/build.mjs --audit`, `node examples/arcade-cabinet/build.mjs --audit` ve `node examples/turning-dial/build.mjs --light --audit` geometri denetimini de çalıştırır. 3D denetimi yavaştır; bkz. [`references/3d.md`](references/3d.md).

## Nasıl çalışır

- **[`SKILL.md`](SKILL.md)** Claude'un okuduğu dosyadır. İş akışını belirler: önce gerçek sayıları topla, nesneyi icat et, bir parça listesi yaz, dünyayı planla, geometriyi kitle bir kez inşa et, arkadan öne boya, çerçevele, canlandır ve sonra bir eleştirmen gibi doğrula. İşçilik kurallarını da kısa haliyle içerir.
- **[`kit/`](kit)** figürlerin inşa edildiği çizim kütüphanesidir: izometrik kamera, katılar ve bir parça kütüphanesi (`iso-kit`), herhangi bir eksende yuvarlak parçalar (`lathe.mjs`), borular ve kablolar (`tube.mjs`), WebGL katmanı (`gl.mjs`), 3D çalışma zamanı (`turn*.mjs`) ve React bileşenleri (`react/`). Bu bileşenler için React dışında hiçbir bağımlılığı yoktur.
- **[`references/`](references)**, Claude'un ihtiyaç duyduğunda açtığı uzun rehberlerdir: işçilik, kit API'si, hareket, React, doğrulama, WebGL, bir tasarım anlatımı ve 3D modu.
- **Doğrulama.** [`kit/audit.mjs`](kit/audit.mjs) geometriyi kanıtlar: hiçbir şey hiçbir şeyin içinden geçmez, her uç bir bağlantıya oturur ve her örtüşme derinlik sırasına göre çizilir (`node build.mjs --audit`). Başsız Chrome'da [`scripts/capture.mjs`](scripts/capture.mjs) ve [`scripts/drive.mjs`](scripts/drive.mjs) ekran görüntüleri, yakın çekimler ve yavaşlatılmış temas sayfaları alır; [`scripts/lines.mjs`](scripts/lines.mjs) havada biten her çizgiyi başarısız sayar ve [`scripts/turn-check.mjs`](scripts/turn-check.mjs) 3D figürleri kontrol eder. Beceri, Claude'a ürettiği her PNG'yi okumasını söyler.

<details>
<summary><b>Repo düzeni</b></summary>

<br>

```text
anatomy/
├── SKILL.md                  the skill: workflow, setup and craft rules
├── kit/                      the drawing library
│   ├── iso-kit.ts            the core: camera, solids, parts, SVG renderer, card and page, CSS
│   ├── iso-kit.mjs           the same core as plain ESM, for Node build scripts
│   ├── iso.css               the kit's CSS, both themes
│   ├── react/                draw.tsx (server-safe components), live.tsx (client hooks)
│   ├── lathe.mjs             round parts on any axis
│   ├── tube.mjs              pipes, tubes and cables
│   ├── audit.mjs             the geometry audit
│   ├── gl.mjs                the WebGL layer for shaders inside the drawing
│   ├── turn.mjs              the 3D runtime (beta)
│   ├── turn-build.mjs        the 3D builder
│   ├── turn-audit.mjs        the 3D orbit audit
│   └── turn-fixed.mjs, canvas-painter.mjs, gl-shared.mjs
│                             experimental variants, not yet documented or used by the examples
├── references/               long-form guides Claude reads as needed
│   ├── craft.md  kit.md  motion.md  react.md
│   └── verify.md  webgl.md  walkthrough.md  3d.md
├── scripts/                  headless Chrome checks and build helpers
│   ├── capture.mjs           screenshots and close-ups
│   ├── drive.mjs             scripted sessions and contact sheets
│   ├── lines.mjs             the line-end check (with line-ends.mjs)
│   ├── inline-kit.mjs        the kit as source, to inline into a standalone page
│   ├── turn-check.mjs        3D checks in the browser (with turn-fidelity.mjs)
│   └── turn-bench.mjs        3D timing in Node
├── examples/                 eight complete figures, built pages committed
├── evals/evals.json          test prompts and what a good answer contains
└── .github/                  issue forms, PR template, CI, README images
```

</details>

## Gereksinimler

| | Ne için gerekli | Notlar |
|---|---|---|
| **[Claude Code](https://code.claude.com/docs/en/overview)** ya da [Antigravity](https://antigravity.google), [OpenCode](https://opencode.ai/docs/skills/), [Codex](https://developers.openai.com/codex/skills) veya [MiniMax Code](https://github.com/MiniMax-AI/minimax-code) | her şey | Beceri Claude Code için yazıldı ve açık Agent Skills formatını izler; bu yüzden Antigravity, OpenCode, Codex ve MiniMax Code da onu yükler. Codex'te tarayıcı kontrolleri Chrome'u başlatır; sandbox bunu engellerse o komutlar için izin ver. |
| **Node.js 20.10+** | derlemeler, kit, kontroller | Yalnızca yerleşik modüller: `npm install` ile kurulacak bir şey yok. Örnekler Node 20.19 ve 22.11'de bayt bayt aynı şekilde yeniden derlendi. Node 20'de tarayıcı betikleri kendilerini `--experimental-websocket` ile yeniden başlatır. |
| **Chrome ya da Chromium** | kontroller | `capture.mjs`, `drive.mjs`, `lines.mjs` ve `turn-check.mjs`; macOS, Linux ve Windows'taki olağan yerlere ve Playwright'ın önbelleğine bakar. Başka bir program için `CHROME_PATH` ayarla. Onu WebGL açık şekilde başsız çalıştırırlar. |
| **React 18+** | yalnızca React çıktısı | `kit/react/`, `examples/test-rig/` ve `examples/spot-plate/`. |

## Sınırlar

- **Bir grafik kütüphanesi değildir.** Eksenler, seriler ya da veri grafikleri yoktur. Sayılar, bir modelle çalışan canlı bir gösterge olarak ve parçaların gerçek boyutları ve adetleri olarak görünür.
- **Makineler, aletler, araçlar ve mobilyalar çizer.** İnsanlar ya da kesin haritalar değil. İnşa edilecek bir mekanizması olmayan bir fikir daha zayıf çıkar.
- **Bilerek yavaştır.** Bir figür uzun bir oturum sürer: parça listesi, geometri, denetim ve her iki temada her eklem yerinin yakın çekimi. Raptor'ın derlemesi birkaç dakika sürer; 30 parça için tam bir 3D yörünge denetimi 15 ila 20 dakika sürer.
- **Shader'lar WebGL gerektirir.** WebGL olmadan SVG yine de okunur; hareket azaltma (reduced motion) açıkken her figür durağan hale gelir.

> [!NOTE]
> **3D modu beta aşamasındadır.** Kendi örneğinde ve bir test figüründe kanıtlandı, henüz üretimde kullanılan bir figürde değil. Küçük bir 3D figür 60 fps'de çalışır; 380 parçalı stres eli, çok yüklü bir makinede 1440 px genişlikte yaklaşık 20 fps, yavaşlatılmış bir telefon profilinde 13 ila 15 fps ölçüldü.

## Bir figür paylaş

İyi bir şey mi yaptın? Ajanından *"publish this figure to the Anatomy community gallery"* (bu figürü Anatomy topluluk galerisinde yayınla) iste. Bir başlık ve GitHub adını sorar, ne göndereceğini gösterir ve senin onayından sonra senin adına [anatomy-community](https://github.com/wheresryan22/anatomy-community) üzerinde bir pull request açar: git yok, elle fork yok. Ya da `scripts/publish.mjs --submit` komutunu kendin çalıştır. Terminal yoksa galerinin **Submit a figure** (Figür gönder) formunu bir GitHub Gist ile kullan.

## Katkıda bulunma

Issue'lar ve pull request'ler memnuniyetle karşılanır. Önce [CONTRIBUTING.md](CONTRIBUTING.md) dosyasını oku: örneklerin derlenmesini, kontrolleri ve bir değişikliğin uyması gereken ev kurallarını anlatır (bunlar arasında: kodda yorum yok ve kit değişiklikleri mevcut her örneği bayt bayt aynı bırakmalı). Lütfen [Davranış Kuralları](CODE_OF_CONDUCT.md)'na uy ve güvenlik sorunlarını [SECURITY.md](SECURITY.md)'de anlatıldığı gibi bildir.

- [Hata bildir](https://github.com/wheresryan22/anatomy/issues/new?template=bug_report.yml)
- [Figür iste](https://github.com/wheresryan22/anatomy/issues/new?template=figure_request.yml)
- [Değişiklik günlüğü](CHANGELOG.md)

## Lisans

[MIT](LICENSE) © 2026 Ryan · [@wheresryan22](https://x.com/wheresryan22)

<p align="center"><sub>Anatomy senin için işe yarar bir şey çizdiyse, bir ⭐ başkalarının da onu bulmasına yardım eder.</sub></p>
