# Azure all-in for Bardery (research, 2026-09-24)

> **Snapshot from 2026-09-24, the basis for [ADR 0004](../adr/0004-azure-for-everything.md).** Prices, versions and preview statuses change; check the linked sources before relying on a number. It was written while 11 Story Languages were planned; tr and uk were later deferred. Earlier research on Google, Anthropic's API and an AWS-only setup was condensed into ADR 0004's considered options.

Question: can Microsoft Azure run **all** of Bardery (hosting plus text, images, narration, embeddings and moderation) in **EU regions only**, so the app lives on one cloud? This is compared with the current plan: AWS (ECS Fargate, RDS Postgres, S3/CloudFront, Bedrock Claude Sonnet 5, Cohere Embed v4, Bedrock Guardrails), plus a second vendor for images and narration. Constraints: 11 Story Languages (en, de, fr, es, it, pt-PT, nl, pl, tr, ru, uk), up to ~16 reference images per illustration, 3 Narrators per language, EU processing, no training on customer data, and an app that children use (see [CONTEXT.md](../../CONTEXT.md)).

Method: Microsoft Learn pages (read as Markdown), the Microsoft Product Terms, the Foundry model-specific terms, the Azure pricing pages and the **Azure Retail Prices API**, Anthropic's Foundry docs, the KEDA docs and the Terraform azurerm provider docs. All were read on 2026-09-24. Every claim links to its source. **Unverified** marks anything I could not confirm from a primary source. Prices are USD list prices on that date. Microsoft Q&A answers are cited only as secondary signals and are labelled as such.

Frequently cited sources, with short names:
- **[Models]** = [Foundry Models sold by Azure](https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/models-sold-directly-by-azure) (page dated 2026-09-21)
- **[Regions]** = [Region availability for Foundry Models sold by Azure](https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/models-sold-directly-by-azure-region-availability)
- **[Data privacy]** = [Data, privacy, and security for Foundry Models sold by Azure](https://learn.microsoft.com/en-us/azure/foundry/responsible-ai/openai/data-privacy)
- **[Abuse monitoring]** = [Foundry Models sold by Azure abuse monitoring](https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/abuse-monitoring)
- **[Azure Product Terms]** = [Microsoft Product Terms, Microsoft Azure](https://www.microsoft.com/licensing/terms/productoffering/MicrosoftAzure/MCA)
- **[Universal Terms]** = [Product Terms, Universal License Terms for Online Services](https://www.microsoft.com/licensing/terms/product/ForOnlineServices/all)
- **[Model terms]** = [Model-specific terms for Microsoft Foundry](https://learn.microsoft.com/en-us/legal/microsoft-foundry/model-specific-terms)
- **[Price API]** = [Azure Retail Prices API](https://prices.azure.com/api/retail/prices), queried with `$filter` on service and region (e.g. `serviceName eq 'Foundry Models' and armRegionName eq 'swedencentral'`)
- **[Speech voices]** = [Azure Speech language and voice support, TTS tab](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=tts)

---

## 0. Findings that change the decision

1. **Claude on Microsoft Foundry has no EU option.** Claude deployments are *Global Standard* or *Data Zone Standard (US)* only, for both "Hosted on Azure" and "Hosted on Anthropic" ([Claude hosting comparison](https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/claude-models-hosting-comparison); Anthropic says the same: [Claude in Microsoft Foundry](https://platform.claude.com/docs/en/build-with-claude/claude-in-microsoft-foundry)). Even when hosted on Azure, **Anthropic is the seller, operator and "independent data processor"**, and Claude is a *Non-Microsoft Product* under the Product Terms (same page). A Microsoft Q&A moderator wrote in April 2026 that EU support is targeted for "2026" with no date ([Q&A, secondary](https://learn.microsoft.com/en-us/answers/questions/5867930/timeline-for-claude-in-microsoft-foundry-to-run-on)). **Azure all-in therefore means writing stories with an OpenAI model, not Claude.**
2. **GPT-6 Sol is available in the EU Data Zone.** `gpt-6-sol` and `gpt-6-luna` (both 2026-09-22) are listed for *Data Zone Standard* in all nine European regions of the table, including swedencentral, germanywestcentral and francecentral ([Regions]). EU Data Zone means *"data processed within any EU member nation"* (same page). EU Data Zone costs **20% more** than Global for GPT-6 ([GPT-6 blog](https://azure.microsoft.com/en-us/blog/gpt-6-astra-sol-and-luna-for-production-agents-in-microsoft-foundry/)).
3. **16 reference images in the EU is possible only with `gpt-image-1.5`, and it is a Limited Access preview.** The Azure image-edit API accepts *"up to 16 input images"* ([image how-to](https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/dall-e)). Of the GPT Image models, only `gpt-image-1.5` has an EU Data Zone deployment (polandcentral, swedencentral). `gpt-image-2` is *Global Standard* only in Europe, which may process data outside the EU ([Regions]). `gpt-image-1.5` is marked *"Limited access preview"* and needs an application ([image how-to](https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/dall-e)). The EU-Data-Zone alternative is **FLUX.2 [pro] with 8 references** ([Models], [Regions]).
4. **Azure Speech can give 3 Narrators in all 11 languages, but tr and uk need multilingual voices.** tr-TR and uk-UA have only 2 native standard voices each ([Speech voices]). The multilingual voices (`en-US-AndrewMultilingualNeural` and others) auto-detect and speak Turkish, Ukrainian, Polish, Russian and Dutch, and speak pt-PT when set with `<lang xml:lang>` ([SSML voice](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-synthesis-markup-voice)). This beats Polly (no Ukrainian at all). How well an en-US persona speaks Ukrainian is **unverified**.
5. **No under-18 ban found in Microsoft's terms for models sold by Azure.** The Code of Conduct, the Universal License Terms (Generative AI Services) and the Azure Product Terms contain no age restriction ([Code of Conduct](https://learn.microsoft.com/en-us/legal/ai-code-of-conduct), [Universal Terms], [Azure Product Terms]). **Exception: Mistral models.** The Foundry model-specific terms forbid sending *"any personal information of children under 13 or the applicable age of digital consent"* and allowing minors to use Mistral *"without consent from their parent or guardian"* ([Model terms]).
6. **Abuse monitoring with possible human review cannot be switched off by a small customer.** Microsoft *"will temporarily store Input and Output Content"* for abuse monitoring; for deployments in the EU Data Boundary, reviewers are located in the EEA ([Azure Product Terms]). Modified abuse monitoring (no storage, no human review) is available *"only to customers and partners managed by a Microsoft account team or under an eligible program"* ([Limited access](https://learn.microsoft.com/en-us/azure/foundry/responsible-ai/openai/limited-access)). The retention period is not stated on the current pages (**unverified**). Bedrock, by contrast, has zero data retention by default for Claude Sonnet 5 (see AWS-only research §6, since condensed into ADR 0004).

---

## 1. Text generation

| Model | EU availability | Streaming / structured output | EU price per MTok (in / cached in / out) | Terms and data |
|---|---|---|---|---|
| **`gpt-6-sol`** (2026-09-22) | EU Data Zone Standard in francecentral, germanywestcentral, italynorth, norwayeast, polandcentral, spaincentral, swedencentral, switzerlandnorth, westeurope ([Regions]) | Streaming, structured outputs, function calling, Responses and Chat Completions APIs; 1.05M context, 128K output ([Models]) | Global short context $2.00 / $0.20 / $10.00; EU Data Zone = Global + 20% ([GPT-6 blog](https://azure.microsoft.com/en-us/blog/gpt-6-astra-sol-and-luna-for-production-agents-in-microsoft-foundry/)), so about **$2.40 / $0.24 / $12.00**. The pricing page says Sol and Luna prices are *"in processing"* ([AOAI pricing](https://azure.microsoft.com/en-us/pricing/details/azure-openai/)) and the [Price API] has no Sol/Luna meters yet. | Sold and hosted by Microsoft; prompts and outputs *"are NOT available to OpenAI"* and are not used to train models ([Data privacy]) |
| `gpt-6-luna` | Same EU Data Zone regions ([Regions]) | Same as Sol ([Models]) | Global $0.10 / $0.01 / $0.50; EU ≈ $0.12 / $0.012 / $0.60 ([GPT-6 blog](https://azure.microsoft.com/en-us/blog/gpt-6-astra-sol-and-luna-for-production-agents-in-microsoft-foundry/)) | Same |
| `gpt-6-astra` | Global in Europe per the region table ([Regions]); the blog says EU Data Zone too, and the [Price API] has EU DZ meters ($12 / $1.20 / $60). **Conflict; treat as unverified.** | Same; may apply *"enhanced safety controls"* that modify classifier thresholds ([Models]) | EU DZ $12 / $1.20 / $60 ([GPT-6 blog](https://azure.microsoft.com/en-us/blog/gpt-6-astra-sol-and-luna-for-production-agents-in-microsoft-foundry/)) | Overkill and expensive for Parts |
| `gpt-5.6-sol` / `-terra` / `-luna` | EU Data Zone, same nine regions ([Regions]) | Structured outputs ([Models]) | EU DZ short context: Sol $4.40 / $0.44 / $22; Terra $2.20 / $0.22 / $13.20; Luna $0.22 / $0.022 / $1.32 ([Price API], swedencentral) | Older and, for Sol, pricier than GPT-6 Sol |
| **Claude** (Opus 5.5, Sonnet 5, Haiku 4.5 …) | **No EU.** Global Standard or US Data Zone only ([Claude hosting comparison](https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/claude-models-hosting-comparison)) | Messages API, structured outputs ([Claude models](https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/claude-models)) | n/a for EU | Anthropic is data processor under its DPA and Commercial Terms; Anthropic Trust & Safety may review flagged content (same page). Not available on free, student, credit-based or CSP subscriptions (same page). |
| `Mistral-Large-3` (preview) | EU Data Zone in seven EU regions ([Regions]) | Tool calling yes; languages listed: en, fr, de, es, it, pt, nl, zh, ja, ko, ar, so **no pl, tr, ru, uk** ([Models]) | EU DZ $0.55 in / $1.65 out ([Price API]) | **Minors clause** (finding 5) |
| `mistral-medium-3-5` (preview) | EU Data Zone ([Regions]) | **Tool calling: No**; JSON response format ([Models]) | Not extracted | Minors clause |

Notes:
- **Quotas.** Some quota tiers must request quota before deploying GPT-6 or GPT-5.6; only Tier 5 and 6 subscriptions have it by default ([Models]). A new subscription should expect a quota request (**timing unverified**).
- **Short vs long context.** GPT-6 uses separate prices for short- and long-context requests, decided by input tokens ([Models]). The threshold for GPT-6 is not stated on the pages I read; GPT-5.4's is 272K ([AOAI pricing](https://azure.microsoft.com/en-us/pricing/details/azure-openai/)). Bardery's prompts (~20K) are well below either (**threshold for GPT-6 unverified**).
- **Avoid stored state.** The Responses API stores message history in the resource ([Data privacy]). ADR 0001 keeps story text in Postgres, so use Chat Completions or disable storage (`store: false`, **Azure support unverified**).
- **Structured output advantage.** On Bedrock, Sonnet 5 does not support structured outputs (AWS-only research, finding 4, since condensed into ADR 0004). GPT-6 Sol on Azure does ([Models]).
- **Multilingual quality.** Microsoft publishes no per-language quality numbers for GPT-6. **Unverified** for all 11 languages; the Q18/Q24 quality check remains the gate.

---

## 2. Image generation with many reference images

| Model | Max references (documented) | EU availability | Price (EU Data Zone) | Status and filters |
|---|---|---|---|---|
| **`gpt-image-1.5`** | **16** (*"You can provide up to 16 input images"*, image-edit API) ([image how-to](https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/dall-e)) | **EU Data Zone**: polandcentral, swedencentral ([Regions]) | Text in $5.50, image in $8.80, cached image in $2.20, image out $35.20 per MTok ([Price API]) | **Limited access preview**, application required ([image how-to](https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/dall-e)). Sizes 1024×1024, 1024×1536, 1536×1024. Face preservation. |
| `gpt-image-2` | 16 (same API) | **Global only** in Europe (polandcentral, swedencentral) ([Regions]). The [Price API] already lists "Image 2 … DZ" meters, which hints at a coming Data Zone (**speculation**). | Global: image in $8, out $30 per MTok ([Price API]) | GA; always processes inputs at high fidelity ([OpenAI image guide](https://developers.openai.com/api/docs/guides/image-generation)) |
| `gpt-image-2.5-sunburst` / `-flare` | 16 (same API) | Not in the region table at all (**unverified**) | Not extracted | GA per the image how-to |
| **FLUX.2 [pro]** | **8** ([Models]) | **EU Data Zone** in francecentral, germanywestcentral, italynorth, polandcentral, spaincentral, swedencentral, westeurope ([Regions]) | EU DZ: $0.033 for the first output MP, $0.0165 per extra output MP and **$0.0165 per reference MP** ([Price API]) | Multi-reference is **Preview** and API-only ([Models]) |
| FLUX.2 [flex] | **10** ([Models]) | **Global only** ([Regions]) | $0.05 per MP, $0.05 per reference MP (Global) ([Price API]) | Preview multi-reference |
| FLUX.1 Kontext [pro] | 1 image ([Models]) | EU Data Zone ([Regions]) | $0.044 per image ([Price API]) | Too few references |
| MAI-Image-2.5 / 2.6 (Microsoft) | *"up to five images"* ([Models]) | Global only (swedencentral, westeurope) ([Regions]) | e.g. 2.6: image in $8, out $38 per MTok ([Price API]) | Preview; prompt language `en` |

**Filters.** All image models get input and output moderation. The default image policy blocks hate, violence, sexual and self-harm at **medium** severity and adds content credentials ([default safety](https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/default-safety-policies)). Thresholds can be made stricter (low) without approval; turning them off needs approval ([content filter](https://learn.microsoft.com/en-us/azure/foundry-classic/foundry-models/concepts/content-filter)). Blocked requests return `content_policy_violation` ([image how-to](https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/dall-e)).

**BFL terms on Foundry.** No age restriction. But Bardery must bind its end users to an agreement at least as protective of BFL as the BFL terms, must run content filtering or review, must implement abuse monitoring, and must not upload images of individuals without consent ([Model terms]). BFL models are sold by Azure, so the Azure data-privacy commitments apply (no provider access, no training) ([Data privacy]).

**Estimated cost per illustration** (**unverified; measure in a prototype**):
- `gpt-image-1.5`, EU DZ, medium, 1024×1536: output ≈ 1,584 tokens ([OpenAI image guide](https://developers.openai.com/api/docs/guides/image-generation)) × $35.20/M ≈ $0.056. Sixteen references at an assumed ~765–1,500 tokens each ≈ 12–24K tokens × $8.80/M ≈ $0.11–0.21, or a quarter of that if cached-input pricing applies to repeated references. **Total ≈ $0.08–0.28.**
- FLUX.2 [pro], EU DZ, 1 MP output with 8 references at 1 MP: $0.033 + 8 × $0.0165 ≈ **$0.17**; with references downscaled to 0.5 MP ≈ $0.10.

**Consequence for Q17.** Azure is the only cloud in this research where 16 references run inside the EU, but only on an older, limited-access preview model. With FLUX.2 [pro] the cap is 8.

---

## 3. Text-to-speech: 3 Narrators × 11 languages

### 3a. Voices per Story Language

Voice types: *Standard* (neural, one locale), *Multilingual* (`…MultilingualNeural`), *Neural HD* (`…:DragonHDLatestNeural`), and **MAI-Voice-2** (Microsoft's new model, **public preview**, *"not recommended for production workloads"*) ([Speech voices], [MAI-Voice](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/mai-voices)).

| Story Language | Native HD (Dragon) | Native multilingual | Native standard | MAI-Voice-2 (preview) | 3 native Narrators? | Multilingual voices usable ([SSML voice](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-synthesis-markup-voice)) |
|---|---|---|---|---|---|---|
| en (en-US / en-GB) | many (e.g. Ava, Andrew, Emma, Brian; en-GB Ada, Ollie) | many | many | several | **Yes** (HD) | n/a |
| de-DE | Seraphina, Florian | Seraphina, Florian | 17 (e.g. Katja, Conrad, Amala) | Klaus, Mia | **Yes** (2 HD + standard, or 2 HD + multilingual) | yes |
| fr-FR | Vivienne, Remy | Vivienne, Remy, Lucien | 16 | Marc, Soleil | **Yes** (3 multilingual) | yes |
| es-ES | Ximena, Tristan | Arabella, Isidora, Tristan, Ximena | 16 | Marta | **Yes** | yes |
| it-IT | Isabella, Alessio | Alessio, Isabella, Giuseppe, Marcello | 17 | Luca, Rosa | **Yes** | yes |
| pt-PT | — | — | Raquel, Duarte, Fernanda | Rui | **Yes** (3 standard) | pt-PT only via `<lang xml:lang="pt-PT">`; auto-detect covers pt-BR |
| nl-NL | — | — | Fenna, Maarten, Colette | Fleur, Sander | **Yes** (3 standard) | yes (auto-detected) |
| pl-PL | — | — | Agnieszka, Marek, Zofia | — | **Yes** (3 standard) | yes |
| tr-TR | — | — | Emel, Ahmet | Aydın, Elif | **No** (2 standard), yes if MAI preview is acceptable | yes |
| ru-RU | — | — | Svetlana, Dmitry, Dariya | Lev, Masha | **Yes** (3 standard) | yes |
| uk-UA | — | — | Polina, Ostap | — | **No** (2 standard) | yes (auto-detected) |

Sources: [Speech voices] for all native voices; [SSML voice](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-synthesis-markup-voice) for multilingual coverage. The documented example set (`en-US-Andrew/Ava/Brian/EmmaMultilingualNeural`) auto-detects **77 languages**, including Dutch, Polish, Turkish, Russian, Ukrainian and pt-BR, and supports pt-PT through SSML (same page).

**Two design options:**
1. **Native voices where possible**, filling tr and uk with one multilingual voice each. Voices would differ in quality tier (HD in de/fr/es/it, standard neural elsewhere).
2. **The same 3 multilingual personas in every language**, e.g. Andrew, Ava and Emma MultilingualNeural. Each Narrator keeps the same voice across languages, which matches CONTEXT.md's "one of three voices". An en-US persona may carry an accent in Ukrainian or Polish (**unverified; listen-test**).

**Dragon HD Omni.** Microsoft says HD Omni covers *"most of the previous voices"* (700+) and that every Omni voice is multilingual. The naming rule is `de-DE-ConradNeural` → `de-DE-Conrad:DragonHDOmniLatestNeural` ([HD voices](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/high-definition-voices)). Whether uk-UA and tr-TR voices have Omni versions is **unverified**; check with the voices-list API.

### 3b. Regions, streaming, pricing, data

- **EU regions:** neural TTS runs in all listed European regions. **HD voices and MAI voices** run in francecentral, swedencentral and westeurope. Azure OpenAI voices in Speech run only in swedencentral in Europe ([Speech regions](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/regions?tabs=tts)).
- **Streaming:** the Speech SDK streams audio chunks (`PullAudioOutputStream`, `Synthesizing` event, `AudioDataStream`) ([TTS latency](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-lower-speech-synthesis-latency)). HD voices are *real-time only* (no batch synthesis) and support a subset of SSML ([HD voices](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/high-definition-voices)).
- **Pricing** (swedencentral): standard neural **$15 per 1M characters**, Neural HD **$22 per 1M characters** ([Price API]). MAI-Voice pricing is not in the Price API (**unverified**, preview).
- **Data:** for prebuilt voices, *"Neither input text nor output audio content is stored in Microsoft logs"* ([TTS privacy](https://learn.microsoft.com/en-us/azure/foundry/responsible-ai/speech-service/text-to-speech/data-privacy-security)). Paid-tier customers may use prebuilt-voice audio commercially ([Azure Product Terms]).

### 3c. OpenAI TTS on Azure

- `tts` and `tts-hd` (both **Preview**) have a regional deployment only in swedencentral in Europe ([Regions], [Models]).
- `gpt-4o-mini-tts` has only a Global deployment, in eastus2 ([Regions]).
- OpenAI voices inside Azure Speech are preview-only, in northcentralus and swedencentral ([Speech voices], footnote 5).
- OpenAI itself says its voices are *"optimized for English"* (AI providers research §3, since condensed into ADR 0004). Azure Speech's native voices are the better fit.

---

## 4. Embeddings

| Model | EU | Dimensions | EU DZ price | Notes |
|---|---|---|---|---|
| **`text-embedding-3-small`** | EU Data Zone in seven EU regions; regional in switzerlandnorth ([Regions]) | 1,536, reducible with `dimensions` ([Models]) | **$0.022 per MTok** ([Price API]) | MIRACL (multilingual retrieval) 44.0 ([Models]) |
| `text-embedding-3-large` | EU Data Zone; regional in eight European regions ([Regions]) | 3,072, reducible ([Models]) | $0.143 per MTok ([Price API]) | MIRACL 54.9 ([Models]). Reduce to ≤2,000 dims for a pgvector `vector` index. |
| Cohere `embed-v-4-0` | Not in any region table ([Regions]); the [Price API] has EU "DZ" meters ($0.132 per MTok text). **Availability unverified.** | 256 / 512 / 1,024 / 1,536 ([Models]) | $0.132 per MTok | Azure lists **512-token input** and only 10 languages (en, fr, es, it, de, pt-br, ja, ko, zh-cn, ar), so **no nl, pl, tr, ru, uk** ([Models]). Bedrock's listing of the same model says 100+ languages and ~128K tokens (AWS-only research §4, since condensed into ADR 0004). |

Embeddings are not covered by the content filter ([content filter](https://learn.microsoft.com/en-us/azure/foundry-classic/foundry-models/concepts/content-filter)). That does not matter for Bardery. **Pick:** `text-embedding-3-small` in the EU Data Zone, at 1,536 or reduced dimensions.

---

## 5. Moderation

**Built-in Guardrails on Azure OpenAI deployments** (included with the deployment; no separate price found in the [Price API], **unverified**):
- Categories: hate, sexual, violence and self-harm at four severity levels. The sexual category explicitly includes *"child exploitation, child abuse, child grooming"*. Optional categories: prompt shields for jailbreaks and indirect attacks, protected material, and PII ([content filter](https://learn.microsoft.com/en-us/azure/foundry-classic/foundry-models/concepts/content-filter)).
- The default is **medium** on prompts and completions, for both text and image models ([default safety](https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/default-safety-policies)).
- Anyone can make the thresholds **stricter (low)**; turning filters off needs approval ([content filter](https://learn.microsoft.com/en-us/azure/foundry-classic/foundry-models/concepts/content-filter)). Bardery should set **low** everywhere.
- A streaming mode filters output in near real time ([content filter](https://learn.microsoft.com/en-us/azure/foundry-classic/foundry-models/concepts/content-filter)).
- The region page says *"The first 1000 characters for text scenarios will be moderated using Guardrails"* under "Input limits for Guardrails in Foundry" ([CS regions](https://learn.microsoft.com/en-us/azure/ai-services/content-safety/region-availability)). Whether this caps checks on long prompts or completions is **unclear**. Until it is clarified, run standalone Content Safety on the full child input and the full Part text.
- Guardrails follow the deployment type: *"regional deployments keep Guardrails processing in-region, while global deployments use global processing"* ([CS regions](https://learn.microsoft.com/en-us/azure/ai-services/content-safety/region-availability)). That Data Zone deployments keep it in the data zone is implied but not stated (**unverified**).

**Azure AI Content Safety (standalone API):**
- Text, image and multimodal analysis, Prompt Shields, protected material, groundedness and custom categories. Available in francecentral, germanywestcentral, italynorth, polandcentral, spaincentral, swedencentral, westeurope and others. Task Adherence always uses global routing ([CS regions](https://learn.microsoft.com/en-us/azure/ai-services/content-safety/region-availability)).
- **Languages:** harm categories were *"trained and tested"* on Chinese, English, French, German, Spanish, Italian, Japanese and Portuguese; Prompt Shields only on English. Other languages *"can work … but the quality might vary"* (same page). So **nl, pl, tr, ru and uk are untested**. On paper this is weaker than Bedrock Guardrails, which calls nl/pl "optimized" and ru/tr/uk "supported" (AWS-only research §5, since condensed into ADR 0004).
- **Limits:** text 10K characters; image 4 MB, 50–7,200 px (same page).
- **Pricing:** $0.375 per 1K text records (1 record = up to 1,000 characters) and $0.75 per 1K images. The free tier has 5,000 text records and 5,000 images per month ([CS pricing](https://azure.microsoft.com/en-us/pricing/details/cognitive-services/content-safety/), [Price API]).

Suggested Azure pipeline:
1. Check child free text with Content Safety text plus Prompt Shields (and the age-band rules in the prompt).
2. Generate the Part with GPT-6 Sol (Guardrails at low).
3. Check the full Part text with Content Safety.
4. Generate the image (Guardrails at low).
5. Check the output image with Content Safety image.

For nl, pl, tr, ru and uk, add an LLM-as-judge check (e.g. GPT-6 Luna, about $0.001 per check).

---

## 6. Hosting

| Component | Azure option | Key facts | EU / cost |
|---|---|---|---|
| App + workers | **Azure Container Apps**, Consumption plan | Scale to zero: *"You aren't billed usage charges if your container app scales to zero"* ([ACA scaling](https://learn.microsoft.com/en-us/azure/container-apps/scale-app)). Custom scale rules accept **any ScaledObject-based KEDA scaler** (same page), including KEDA's **`postgresql` scaler**, which scales on the result of a SQL query ([KEDA PostgreSQL](https://keda.sh/docs/latest/scalers/postgresql/)). A pg-boss queue can therefore drive scaling with a query like `SELECT count(*) FROM pgboss.job WHERE state='created'`. Default polling interval 30 s, cool-down 300 s ([ACA scaling](https://learn.microsoft.com/en-us/azure/container-apps/scale-app)). Managed-identity auth for scale rules is documented only for Azure Queue, Service Bus and Event Hubs, so the Postgres scaler uses a secret (same page). Event-driven **Container Apps jobs** can use ScaledJob scalers ([ACA scaling](https://learn.microsoft.com/en-us/azure/container-apps/scale-app), [jobs](https://learn.microsoft.com/en-us/azure/container-apps/jobs)). | vCPU $0.000024/s active and $0.000003/s idle; memory $0.000003/GiB-s; requests $0.40 per 1M. Monthly free grant per subscription: 180,000 vCPU-s, 360,000 GiB-s and 2M requests ([Price API], [ACA billing](https://learn.microsoft.com/en-us/azure/container-apps/billing)). No environment fee unless you use private endpoints, planned maintenance or dedicated profiles ($0.13/h) ([ACA billing](https://learn.microsoft.com/en-us/azure/container-apps/billing), [Price API]). |
| SSE / streaming | ACA ingress | HTTP/1.1 and HTTP/2, WebSocket and gRPC; *"Request time out is 240 seconds"* ([ingress](https://learn.microsoft.com/en-us/azure/container-apps/ingress-overview)). Premium ingress makes the idle timeout configurable from 4 to 30 minutes, but needs a dedicated workload profile with at least two nodes ([ingress env config](https://learn.microsoft.com/en-us/azure/container-apps/ingress-environment-configuration)). A Part streams well under 240 s; send SSE keep-alive comments. Whether 240 s is an idle or total timeout on the default ingress is **unverified**. | — |
| Database | **Azure Database for PostgreSQL Flexible Server**, Burstable **B1ms** (1 vCore, 2 GiB) ([compute](https://learn.microsoft.com/en-us/azure/postgresql/compute-storage/concepts-compute)) | `pgvector` is supported; allowlist the extension `vector` first ([pgvector](https://learn.microsoft.com/en-us/azure/postgresql/extensions/how-to-use-pgvector)). Microsoft says Burstable is *"primarily designed for nonproduction scenarios"*, doesn't qualify for 24/7 support, and can become unreachable when CPU credits run out ([compute](https://learn.microsoft.com/en-us/azure/postgresql/compute-storage/concepts-compute)). The same caveat applies to RDS t4g.micro. | swedencentral: B1ms **$0.0199/h ≈ $14.53/month**; storage $0.1369/GB-month, so 32 GiB ≈ $4.38; backup $0.103/GB-month ([Price API]) |
| Media | **Blob Storage** (Hot LRS) + user-delegation **SAS** | Hot LRS $0.0184/GB-month; reads $0.004 per 10K; writes $0.05 per 10K ([Price API], swedencentral) | — |
| CDN | **Azure Front Door Standard** (optional) | With a private blob origin on Standard, protect requests with a SAS and enable "Use Query String" caching, which *"might limit the effectiveness of caching"*; Private Link origins need Premium ([Front Door + blobs](https://learn.microsoft.com/en-us/azure/frontdoor/scenario-storage-blobs)). Front Door does not sign URLs itself. | Standard **$35/month base** plus $0.0825/GB and $0.009 per 10K requests (Zone 1); Premium $330/month ([Price API]). **Recommendation:** skip Front Door at first and serve media straight from Blob with short-lived SAS URLs. |
| Email (one-time codes) | **Azure Communication Services Email** | Message content is processed in the resource's chosen *Data Location*; recipient addresses of hard bounces are kept temporarily for abuse prevention ([ACS privacy](https://learn.microsoft.com/en-us/azure/communication-services/concepts/privacy)) | $0.00025 per email plus $0.00012 per MB ([Price API]) |
| Secrets | **Key Vault** Standard | — | $0.03 per 10K operations ([Price API]) |
| Registry, logs | ACR Basic (or GHCR); Log Analytics | — | ACR Basic $0.1666/day ≈ $5/month; Log Analytics first 5 GB/month free, then $2.99/GB ([Price API]) |

**Region choice:** **swedencentral** has everything in one place: GPT-6 Sol (EU DZ), `gpt-image-1.5` (EU DZ), FLUX.2 [pro] (EU DZ), embeddings (EU DZ), Speech with HD and MAI voices, Content Safety, ACA and Postgres ([Regions], [Speech regions](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/regions?tabs=tts), [CS regions](https://learn.microsoft.com/en-us/azure/ai-services/content-safety/region-availability), [Price API]). germanywestcentral lacks HD and MAI voices ([Speech regions](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/regions?tabs=tts)).

---

## 7. Terraform and CI

- **azurerm** is at **v5.6.0** (2026-09-17) ([releases](https://github.com/hashicorp/terraform-provider-azurerm/releases)). Resources exist for every component:
  - `azurerm_cognitive_account` (kinds `AIServices`, `SpeechServices`, `ContentSafety` …) ([docs](https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/cognitive_account.html.markdown)).
  - `azurerm_cognitive_deployment` with SKU `DataZoneStandard` ([docs](https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/cognitive_deployment.html.markdown)).
  - `azurerm_cognitive_account_rai_policy` for content-filter policies ([docs](https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/cognitive_account_rai_policy.html.markdown)).
  - `azurerm_container_app` with `custom_scale_rule` (`custom_rule_type` includes `postgresql`) ([docs](https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/container_app.html.markdown)), and `azurerm_container_app_job` ([docs](https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/container_app_job.html.markdown)).
  - `azurerm_postgresql_flexible_server`, `azurerm_storage_account`, `azurerm_cdn_frontdoor_*`, `azurerm_communication_service`, `azurerm_email_communication_service` and `azurerm_key_vault` (all under [website/docs/r](https://github.com/hashicorp/terraform-provider-azurerm/tree/main/website/docs/r)).
  - Provisioned-throughput purchase is not possible from Terraform ([cognitive_deployment docs](https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/cognitive_deployment.html.markdown)); Bardery doesn't need it.
  - Gaps such as limited-access approvals, quota requests and Marketplace offers are portal or form steps, not Terraform.
- **GitHub Actions OIDC:** Entra federated credentials with the scenario *"GitHub actions deploying Azure resources"*, per environment, branch, PR or tag ([Microsoft Learn](https://learn.microsoft.com/en-us/azure/developer/github/connect-from-azure-openid-connect)). azurerm authenticates with OIDC via `use_oidc` / `ARM_USE_OIDC` ([provider guide](https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/guides/service_principal_oidc.html.markdown)).

---

## 8. Cost

### 8a. Per Part (same assumptions as the earlier research: ~700 output tokens, up to 20K input tokens, one image, ~2,100 narrated characters)

| Item | Azure all-in | AWS + Azure for images/speech (hybrid) |
|---|---|---|
| Text | GPT-6 Sol EU DZ ($2.40 / $0.24 / $12): ≈ $0.057 uncached, ≈ $0.015–0.02 mostly cached | Sonnet 5 `eu.` on Bedrock: ≈ $0.052 uncached, ≈ $0.01–0.02 cached (AWS-only §7, since condensed into ADR 0004) |
| Image | `gpt-image-1.5` EU DZ ≈ $0.08–0.28, or FLUX.2 [pro] ≈ $0.10–0.17 (**unverified**, §2) | Same Azure image models, plus AWS egress for ~16 references (≈ 20–30 MB at ~$0.09/GB ≈ $0.002–0.003, **AWS egress rate not re-verified**) |
| Audio | Neural $15/M × 2,100 ≈ **$0.032**; HD $22/M ≈ **$0.046** | Same (Azure Speech) |
| Embedding | 3-small EU DZ ≈ $0.00001 | Cohere Embed v4 ≈ $0.00005 |
| Moderation | Content Safety: ~3 text records + 1 image ≈ $0.002 (free tier covers early use) | Guardrails ≈ $0.002 |
| **Total** | **≈ $0.13–0.35 with audio; ≈ $0.10–0.30 without** | **About the same** |

### 8b. Fixed monthly cost (idle / low traffic)

Azure assumptions: API as an ACA app with 0.5 vCPU / 1 GiB and `minReplicas: 1` in prod. If pg-boss polls inside the API, the replica is never "idle" (it needs <0.01 vCPU and <1,000 B/s, per [ACA billing](https://learn.microsoft.com/en-us/azure/container-apps/billing)), so it bills at the active rate. The worker scales from zero on the KEDA Postgres scaler. Staging scales to zero.

| Line item | Azure prod | Azure staging | AWS prod (current plan) |
|---|---|---|---|
| Compute | ACA API: $39.42 active − $5.40 free grant ≈ **$34**; ≈ $12 if the replica qualifies as idle ([Price API], [ACA billing](https://learn.microsoft.com/en-us/azure/container-apps/billing)). Worker ≈ $0–3. | ≈ $0 (scale to zero; cold start of seconds, **unverified**) | ECS Fargate, 2 small tasks |
| Load balancer / IPv4 | none needed (ACA ingress included) | none | ALB + public IPv4 |
| Database | B1ms $14.53 + 32 GiB $4.38 ≈ **$19** | ≈ $19, or ≈ $4.40 storage-only when the server is stopped (stop/start duration limits **unverified**) | RDS t4g.micro |
| Storage / CDN | Blob < $1; Front Door optional **+$35** | < $1 | S3 + CloudFront |
| Registry, logs, secrets, email | ACR Basic ≈ $5 (or $0 with GHCR); logs $0 within 5 GB; Key Vault, email < $1 | shared | — |
| AI services fixed fees | $0 (all per-use meters, [Price API]) | $0 | $0 |
| **Total** | **≈ $25–60 without Front Door; ≈ $60–95 with it** | **≈ $5–20** | **≈ $60** (given); staging not in the AWS estimate |

**Hybrid total** = the AWS plan (~$60 prod, plus staging) + $0 fixed on Azure (Speech and Foundry bill per use) + two clouds to operate: two IaC stacks, two OIDC setups, two billing accounts and cross-cloud secrets.

---

## 9. Coverage and verdict

### Coverage

| Modality / component | Azure option (EU) | Gap |
|---|---|---|
| Text | **GPT-6 Sol**, EU Data Zone, strict structured outputs, streaming | **No Claude in the EU** (Global/US only; Anthropic is processor). Quota request likely. nl/pl/tr/ru/uk quality unverified. |
| Image (multi-ref) | **`gpt-image-1.5`**, EU DZ, **16 refs**; or FLUX.2 [pro], EU DZ, 8 refs | 1.5 is a **limited-access preview** and an older model; `gpt-image-2` is Global-only in Europe. FLUX multi-ref is preview. |
| TTS 3×11 | Azure Speech: native voices give 3 Narrators in 9 languages; tr and uk need 1 multilingual voice each (or use 3 multilingual personas everywhere) | tr/uk accent quality unverified; MAI-Voice-2 is preview; HD voices only in francecentral, swedencentral and westeurope |
| Embeddings | `text-embedding-3-small`, EU DZ, $0.022/MTok | None (Cohere on Azure is limited and its availability unverified) |
| Moderation | Built-in Guardrails (set to low) + Content Safety text/image + Prompt Shields | Harm classifiers untested for nl, pl, tr, ru, uk; the "first 1000 characters" note needs clarifying |
| Data use | No training; no OpenAI/BFL access; EU DZ processing | **Abuse-monitoring storage and possible human review (EEA reviewers); opt-out only for managed customers**; retention period not stated |
| Minors / terms | No age ban for Microsoft-sold models | Mistral: parental consent and no under-13 PI (avoid Mistral). BFL: end-user terms flow-down. Claude: Anthropic terms. |
| Hosting | ACA (scale to zero, KEDA `postgresql` scaler), Postgres Flexible B1ms + pgvector, Blob + SAS, ACS Email, Key Vault | 240 s ingress timeout (configurable only on premium ingress); Burstable Postgres is "nonproduction" by Microsoft's own wording |
| IaC / CI | azurerm v5.6.0 covers all resources; GitHub OIDC federation | Approvals, quotas and limited access are manual forms |

### Verdict

**Yes: Azure can run everything Bardery needs inside the EU on one contract.** It is the only cloud in this research series that does so:
- Google's terms exclude apps likely used by under-18s (AI providers research, finding 1, since condensed into ADR 0004).
- AWS has no EU image model and no Ukrainian TTS (AWS-only research, since condensed into ADR 0004).

Azure all-in also idles cheaper than the AWS plan: roughly **$25–60 prod** with no load balancer and scale-to-zero staging, against ~$60 prod. Per-Part costs are about the same.

The trade-offs:
1. **Losing Claude.** On Azure I would write stories with **GPT-6 Sol (EU Data Zone)**, and use GPT-6 Luna for cheap helpers such as moderation judges and summaries. Nothing in Microsoft's or Anthropic's primary sources shows that either model writes better children's stories in Bardery's 11 languages. The loss matters only if the Q18/Q24 quality check shows Claude clearly ahead. GPT-6 Sol also brings strict structured outputs, which Sonnet 5 lacks on Bedrock. **Recommendation:** run the language quality check with both models before committing.
2. **Images depend on a preview.** 16 references in the EU exist only via `gpt-image-1.5` (limited access, apply now). The fallback is FLUX.2 [pro] with 8 references. Watch for a `gpt-image-2` EU Data Zone; the Price API already lists DZ meters for it.
3. **Microsoft abuse monitoring.** Flagged prompts and outputs may be stored and reviewed by humans in the EEA, and a small customer cannot opt out. Bedrock offers zero retention by default. Name this in the privacy notice. It may be acceptable because reviewers stay in the EEA and data stays in the EU Data Zone ([Azure Product Terms], [Abuse monitoring]).
4. **Moderation language coverage** is weaker on paper than Bedrock Guardrails for nl, pl, tr, ru and uk. Add an LLM-judge pass for those languages either way.

**If Claude wins the quality check,** the cheapest split is not "AWS + Azure for images/speech". It is **Azure for everything except text, with Claude Sonnet 5 via Bedrock `eu.`** That keeps hosting, images, speech, embeddings and moderation on Azure, and makes AWS a single pay-per-use API with no fixed infrastructure. Otherwise, **go Azure all-in**.

### Open items

1. Apply for `gpt-image-1.5` limited access, and request GPT-6 quota in swedencentral.
2. Prototype: GPT-6 Sol vs Claude Sonnet 5 on the 11-language quality check; `gpt-image-1.5` (16 refs) vs FLUX.2 [pro] (8 refs) for Hero and House Style consistency; measure image input tokens and cost.
3. Listen-test tr and uk with multilingual voices (and MAI-Voice-2 for tr), and decide between native voices and 3 cross-language personas.
4. Ask Microsoft: the abuse-monitoring retention period; whether "first 1000 characters" limits deployment Guardrails; when `gpt-image-2` gets an EU Data Zone; the MAI-Voice GA date and price.
5. Check whether Dragon HD Omni versions exist for uk-UA and tr-TR voices (voices-list API).
6. Confirm the ACA default-ingress 240 s timeout semantics (idle vs total) for SSE.
