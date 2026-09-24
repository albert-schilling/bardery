# Azure for hosting and all AI models

Bardery runs entirely on Microsoft Azure in the EU (region `swedencentral`, AI models deployed in the EU Data Zone): hosting, Postgres, storage, email, and every AI model (story text, illustrations, narration, embeddings, content filtering). Azure was the only cloud we researched that covers every modality inside the EU under terms that allow an app used by children (see the [research snapshot](../research/2026-09-24-azure-all-in.md)). One cloud keeps a solo-run system simple: one Terraform provider, one identity model, one bill, and Container Apps that scale to zero.

## Considered options

- **Google Cloud** would bundle the most modalities in the EU, but its terms forbid its generative AI services in any app *"directed towards or likely to be accessed by individuals under the age of 18"* ([Service Specific Terms §20(d)](https://cloud.google.com/terms/service-terms)). That also rules out Claude on Vertex.
- **Anthropic's own API** offers no EU processing, only `global` or `us` ([data residency](https://platform.claude.com/docs/en/build-with-claude/data-residency)).
- **AWS only**: Bedrock has no EU image model that takes multiple references (Nova Canvas is closed to new customers and reaches end of life on 2026-09-30, see [Bedrock model lifecycle](https://docs.aws.amazon.com/bedrock/latest/userguide/model-lifecycle-legacy.html)), and Polly has no Ukrainian voice and only two Turkish and Russian ones ([Polly voices](https://docs.aws.amazon.com/polly/latest/dg/available-voices.html)). Filling the gaps would have meant running our own GPU services.
- **AWS with Claude on Bedrock**, plus a second vendor for illustrations and narration: rejected because it means two clouds for one small app.
- **Azure for everything except story text**, with Claude on Bedrock: rejected because we expect GPT-6 Sol to be good enough, so a second cloud isn't justified.

## Consequences

- Stories are written by GPT-6 Sol, not Claude. Claude on Azure isn't processed in the EU.
- Illustrations use FLUX.2 [pro], which takes at most 8 reference images, or `gpt-image-1.5` (16 references, limited-access preview). The reference cap in ADR 0001 is set per model.
- Azure's abuse monitoring may store flagged prompts and outputs and let people in the EEA review them. We can't opt out without a Microsoft account team, so the privacy notice must say so.
- Content Safety's filters are not tuned for nl, pl, tr, ru or uk. Our own safety classifier and the safety evals cover that gap.
- Providers sit behind interfaces, so moving a single modality elsewhere is an adapter change plus a new ADR.
