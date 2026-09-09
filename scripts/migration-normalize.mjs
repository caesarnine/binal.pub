export function normalizedArticle(source) {
  return source.replace(/^(?:\+\+\+|---)\n[\s\S]*?\n(?:\+\+\+|---)\n/, '')
    .replace(/\{\{< video src="gpt4-structured-ocr" >\}\}/g, '[OCR VIDEO]')
    .replace(/<video\b[\s\S]*?<\/video>/g, '[OCR VIDEO]')
    .replace(/\]\(\/\d{4}\/\d{2}\/[^/]+\/([^/)]+)\)/g, ']($1)')
    .replace(/^```dockerfile$/gm, '```docker')
    .replace(/^```(?:docker-compose|yaml)$/gm, '```yaml')
    .trim();
}
