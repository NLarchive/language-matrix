#!/usr/bin/env node
/**
 * CSV Schema Validator
 * Scans known CSV files under data/ and languages folders validating headers
 * against the canonical schema at data/csv-schema.json
 */

const fs = require('fs');
const path = require('path');

function loadJson(p) {
  try { return JSON.parse(fs.readFileSync(p,'utf8')); } catch(e) { return null; }
}

const repoRoot = path.resolve(__dirname, '..');
const schemaPath = path.join(repoRoot, 'data', 'csv-schema.json');
const schema = loadJson(schemaPath);
if (!schema) {
  console.error('ERROR: Could not load schema:', schemaPath);
  process.exit(2);
}

function readHeader(file) {
  try {
    const txt = fs.readFileSync(file, 'utf8');
    const first = txt.split('\n')[0] || '';
    return first.trim();
  } catch (e) { return null; }
}

function splitHeader(headerLine) {
  if (!headerLine) return [];
  // parse simple CSV header (we do not expect quoted commas in column names here)
  return headerLine.split(',').map(h => h.trim()).filter(Boolean);
}

let errors = [];

// Validate matrix_index.json
(() => {
  const mi = loadJson(path.join(repoRoot, 'data', 'matrix_index.json'));
  if (!mi) { errors.push('data/matrix_index.json not found or invalid JSON'); return; }
  mi.forEach((entry, idx) => {
    const miss = schema.matrix_index.required.filter(k => !(k in entry));
    if (miss.length) errors.push(`matrix_index[${idx}].missing: ${miss.join(',')}`);
  });
})();

// Validate categories_config.csv
(() => {
  const file = path.join(repoRoot, 'data', 'categories_config.csv');
  const header = readHeader(file);
  if (!header) { errors.push('data/categories_config.csv missing or empty'); return; }
  const cols = splitHeader(header);
  const req = schema.categories_config.required;
  req.forEach(c => { if (!cols.includes(c)) errors.push(`categories_config.csv missing column: ${c}`); });
})();

// Validate top-level vocab.csv (required) and config.csv
(() => {
  const file = path.join(repoRoot, 'data', 'vocab.csv');
  if (!fs.existsSync(file)) { errors.push('data/vocab.csv missing'); return; }
  const header = readHeader(file);
  if (!header) { errors.push('data/vocab.csv missing or empty'); return; }
  const cols = splitHeader(header);
  (schema.top_level.vocab_csv.required || []).forEach(req => { if (!cols.includes(req)) errors.push(`data/vocab.csv missing required column: ${req}`); });

  // Validate data/config.csv (structure reference)
  const cfg = path.join(repoRoot, 'data', 'config.csv');
  if (!fs.existsSync(cfg)) { errors.push('data/config.csv missing'); }
  else {
    const ch = readHeader(cfg);
    if (!ch) { errors.push('data/config.csv missing or empty'); }
    else {
      const ccols = splitHeader(ch);
      // If alternates are provided for config format, allow one of the formats
      const configSchema = schema.top_level.config_csv || {};
      if (configSchema.alternates && Object.keys(configSchema.alternates).length > 0) {
        let matchedAlternate = false;
        Object.keys(configSchema.alternates).forEach(alt => {
          const altCols = configSchema.alternates[alt] || [];
          if (altCols.every(a => ccols.includes(a))) matchedAlternate = true;
        });
        if (!matchedAlternate) {
          // Fall back to required set
          (configSchema.required || []).forEach(req => { if (!ccols.includes(req)) errors.push(`data/config.csv missing required column: ${req}`); });
        }
      } else {
        (configSchema.required || []).forEach(req => { if (!ccols.includes(req)) errors.push(`data/config.csv missing required column: ${req}`); });
      }
    }
  }
})();

// Walk language folders
const languagesDir = path.join(repoRoot, 'data', 'languages');
if (!fs.existsSync(languagesDir)) {
  errors.push('data/languages not found');
} else {
  const langs = fs.readdirSync(languagesDir).filter(f => fs.statSync(path.join(languagesDir,f)).isDirectory());
  langs.forEach(lang => {
    const p = path.join(languagesDir, lang);
    const levels = ['basic', 'intermediate', 'advanced'];
    levels.forEach(lvl => {
      const f = path.join(p, `${lvl}.csv`);
      if (!fs.existsSync(f)) return; // skip missing levels
      const header = readHeader(f);
      const cols = splitHeader(header);
      // Check required for vocabulary
      schema.vocabulary.required.forEach(req => {
        if (!cols.includes(req)) {
          errors.push(`${path.relative(repoRoot,f)} missing required column: ${req}`);
        }
      });
      // Check if at least one pronunciation column exists
      const pronAlternates = schema.vocabulary.alternates.pronunciation;
      if (!pronAlternates.some(a => cols.includes(a))) {
        errors.push(`${path.relative(repoRoot,f)} missing pronunciation column (one of: ${pronAlternates.join(', ')})`);
      }
      // Check component column existence
      const compAlternates = schema.vocabulary.alternates.component_column;
      if (!compAlternates.some(a => cols.includes(a))) {
        // Not fatal in all cases — log as warning
        errors.push(`${path.relative(repoRoot,f)} missing component column (recommended one of: ${compAlternates.join(', ')})`);
      }
    });

    // radicals directory - validate every csv inside it (radicals.csv, radicals_214.csv, etc.)
    const radicalsDir = path.join(p, 'radicals');
    if (fs.existsSync(radicalsDir) && fs.statSync(radicalsDir).isDirectory()) {
      const radFiles = fs.readdirSync(radicalsDir).filter(x => x.toLowerCase().endsWith('.csv'));
      if (radFiles.length === 0) {
        errors.push(`${path.relative(repoRoot, radicalsDir)} exists but contains no .csv files`);
      }
      radFiles.forEach(rf => {
        const radFile = path.join(radicalsDir, rf);
        const header = readHeader(radFile);
        const cols = splitHeader(header);
        // Some canonical radical files (e.g., radicals_214.csv) do not include 'Set' and are allowed
        const is214 = rf.toLowerCase().includes('214');
        const requiredCols = is214 ? ['Radical','Pinyin','Description','Meaning'] : schema.radicals.required;
        requiredCols.forEach(req => {
          if (!cols.includes(req)) errors.push(`${path.relative(repoRoot,radFile)} missing required column: ${req}`);
        });
      });
    } else {
      // Not an error — some languages can synthesize radicals from vocabulary mapping
      errors.push(`${path.relative(repoRoot,p)}/radicals/ not found`);
    }
  });
}

if (errors.length > 0) {
  console.log('\nCSV Schema Validation: ERRORS found');
  errors.forEach(e => console.log('- ' + e));
  process.exit(1);
} else {
  console.log('CSV Schema Validation: OK — all checked files conform to schema rules');
}
