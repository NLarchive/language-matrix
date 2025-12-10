# Janulus Matrix — Chinese (汉语) grammar capture

This document explains how to model Chinese grammar as a Janulus-style matrix — a structured table that records grammatical components and their features as variables. The aim is to capture key grammatical traits at multiple levels (character, token/word, phrase, sentence) in a machine-friendly table so you can analyze, compare, or feed the matrix to downstream tools (e.g., classifiers, clustering, or visualization).

## Concept: Representing grammar as variables

The Janulus matrix is a matrix (or set of matrices) where each row represents an element (character, token, phrase, or sentence) and each column represents a grammatical variable (feature). Typical variables include:

- token (surface form)
- lemma (dictionary form)
- pos (part-of-speech)
- dep_head (dependency head index)
- dep_rel (dependency relation label)
- morphological features (aspect, tense, plurality — for Chinese often sparse)
- function markers (particles: 了, 过, 吗, 吧)
- classifier / measure word
- word order indices (position in sentence)
- multiword construction flags (e.g., serial verbs, compounds)
- semantics / topic/focus markers (optional)

## Chinese-specific grammar features to capture

Chinese (Mandarin) has specific traits you should capture in the matrix:

- No productive inflection for tense/person/number — but captures aspect and particles (了, 过, 着)
- Classifiers or measure words required with most nouns + numeric expressions (个, 把, 本, 条)
- Topic-prominent constructions (e.g., topic-comment) and flexible word order in pragmatic contexts
- Particles for yes/no or modality (吗, 吗) and sentence-final mood particles (了, 吧, 呢)
- Serial verb constructions and resultative complements (e.g., 看见, 吃完)
- Aspect markers and resultative complements appear as separate tokens
- Politeness/negation markers (不, 没)

## Example: Sentence-level Janulus matrix

Sentence: 我昨天去了商店买苹果。

The matrix below shows a concise row per token with important variables (example values):

| idx | token | lemma | pos | dep_head | dep_rel | aspect | classifier | role |
|-----|-------|-------|-----|----------|---------|--------|------------|------|
| 1   | 我    | 我    | PRON | 2      | nsubj  | -      | -          | subject |
| 2   | 昨天  | 昨天  | NOUN | 3      | tmod   | -      | -          | time    |
| 3   | 去了  | 去    | VERB | 0      | root   | 了(aspect) | -     | action  |
| 4   | 商店  | 商店  | NOUN | 3      | obj    | -      | 个?        | destination |
| 5   | 买    | 买    | VERB | 3      | conj   | -      | -          | action  |
| 6   | 苹果  | 苹果  | NOUN | 5      | obj    | -      | 个         | object  |

This representation makes it easy to filter, aggregate, or visualize features such as aspect usage, classifier distribution, or role frequencies.

## Representations and tools

You can store Janulus matrices in these formats:
- CSV / TSV (spreadsheet friendly)
- JSONL (one row per token / sentence)
- Pandas DataFrame (for Python analysis)
- Sparse matrix or tensors for ML pipelines

---

Below is a tiny Python demo (in the workspace) that builds a DataFrame representing a Janulus matrix for sample sentences. See the included script `scripts/janulus_matrix_demo.py`.

If you'd like, I can:

- Extend the demo to parse Chinese automatically using an existing library (StanfordCoreNLP, spaCy + zh models, or HanLP) to fill POS/dependencies automatically.
- Produce many example matrices for different sentence types (questions, negation, topic-prominent, classifiers, numbers, etc.).
- Visualize feature distributions and save CSV/JSON for later analysis.

Tell me which next step you prefer and I'll implement it in the project. 

