/**
 * G1 precursor rule (shared): forbid raw hex color literals in SUS package
 * sources. Used by eslint.config.mjs (commit-blocking) and by the gate
 * checker's executable G1 check (T0159).
 */
const HEX = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export const noRawStyleValues = {
  meta: {
    type: 'problem',
    docs: { description: 'no raw hex color literals in SUS package sources (G1 precursor)' },
    schema: [],
    messages: {
      rawHex:
        'Raw hex color "{{value}}". SUS package styling must reference design tokens (ADR-004/G1), not literals.',
    },
  },
  create(context) {
    return {
      Literal(node) {
        if (typeof node.value === 'string' && HEX.test(node.value.trim())) {
          context.report({ node, messageId: 'rawHex', data: { value: node.value.trim() } });
        }
      },
      TemplateElement(node) {
        const raw = (node.value?.raw ?? '').trim();
        if (HEX.test(raw)) {
          context.report({ node, messageId: 'rawHex', data: { value: raw } });
        }
      },
    };
  },
};
