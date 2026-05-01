export interface PromptApplication {
  buildingType: string;
  numFloors: number;
  totalAreaSqft: number;
  landAreaKatha: number;
  landAddressEn: string;
  authorityCode: string;
}

export interface PromptDocument {
  type: string;
  fileName: string;
  textContent?: string;
}

export interface PromptInput {
  application: PromptApplication;
  documents: PromptDocument[];
}

const MAX_TOKENS = 25_000;
const PER_DOC_EXCERPT_LIMIT = 2_000;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function renderPrompt(input: PromptInput, perDocLimit: number): string {
  const docs = input.documents
    .map((d) => {
      if (!d.textContent) {
        return `- ${d.type}: ${d.fileName} (no text extracted)`;
      }
      const excerpt = d.textContent.slice(0, perDocLimit);
      return `- ${d.type}: ${d.fileName}\n  Content excerpt: ${excerpt}`;
    })
    .join('\n');

  return `You are an expert Bangladesh building regulation compliance reviewer.
Analyze the following building permit application and uploaded documents.

APPLICATION DETAILS:
- Building Type: ${input.application.buildingType}
- Number of Floors: ${input.application.numFloors}
- Total Area: ${input.application.totalAreaSqft} sqft
- Land Area: ${input.application.landAreaKatha} katha
- Location: ${input.application.landAddressEn}
- Authority: ${input.application.authorityCode}

UPLOADED DOCUMENTS:
${docs}

Based on Bangladesh National Building Code (BNBC) 2020 and relevant regulations for ${input.application.authorityCode}, evaluate:

1. LAND DOCUMENTATION: Are ownership documents complete and consistent?
2. ARCHITECTURAL COMPLIANCE: Does the building design comply with FAR, setback, height, and coverage rules for ${input.application.buildingType} buildings?
3. STRUCTURAL SAFETY: Are structural plans and soil test adequate for ${input.application.numFloors} floors?
4. ENVIRONMENTAL COMPLIANCE: Are environmental requirements met?
5. FIRE SAFETY: Are fire safety provisions adequate for this building type and size?

For each category, provide:
- Score (0-100)
- Findings with severity (critical/major/minor)
- Relevant BNBC 2020 rule reference
- Specific recommendation

Respond ONLY with valid JSON in this exact format:
{
  "overall_score": <number 0-100>,
  "categories": [
    {
      "name": "<category name>",
      "score": <number 0-100>,
      "findings": [
        {
          "severity": "critical" | "major" | "minor",
          "description": "<specific issue found>",
          "rule_reference": "<BNBC section or rule number>",
          "recommendation": "<what should be done to fix this>",
          "document_type": "<optional: the document_type this finding refers to, if any>"
        }
      ]
    }
  ],
  "summary": "<2-3 sentence overall assessment>",
  "critical_issues_count": <number>,
  "recommendation": "approve" | "needs_correction" | "reject"
}`;
}

/**
 * Build a compliance prompt, shrinking per-document excerpts until the total
 * estimated token count fits within MAX_TOKENS. Worst case the document
 * excerpts collapse to just filenames; we never drop the system instructions.
 */
export function buildCompliancePrompt(input: PromptInput): string {
  let limit = PER_DOC_EXCERPT_LIMIT;
  let prompt = renderPrompt(input, limit);

  while (estimateTokens(prompt) > MAX_TOKENS && limit > 100) {
    limit = Math.floor(limit * 0.6);
    prompt = renderPrompt(input, limit);
  }

  if (estimateTokens(prompt) > MAX_TOKENS) {
    // Last resort: drop excerpts entirely.
    prompt = renderPrompt(
      { ...input, documents: input.documents.map((d) => ({ ...d, textContent: undefined })) },
      0
    );
  }

  return prompt;
}
