# NLP Recommendation System

This document outlines the Natural Language Processing (NLP) recommendation layer in Twins.

## Overview
In addition to the Big Five Personality PCA (80%) and ELO (20%), Twins now supports **Interest Matching** via vector embeddings. This allows users to find matches based on shared hobbies and keywords.

## Architecture

### 1. Data Input
- Users add hobbies as free-text keywords in `UserSettingsScreen`.
- Constraints: 2-30 chars per hobby, max 10 hobbies.

### 2. Embedding Generation (`/functions/embed`)
- **Model**: `Supabase/gte-small` (via `@xenova/transformers`).
- **Process**:
  1. Client joins hobbies into a single string (e.g., "Hiking, Sci-Fi, Cooking").
  2. Calls `embed` edge function.
  3. Function returns a 384-dimensional vector.
- **Storage**:
  - `public.profiles.hobbies` (`text[]`): Raw keywords for UI.
  - `public.profiles.hobby_embedding` (`vector(384)`): Generated vector for math.

### 3. Recommendation Logic (`/functions/recommend-users`)
When `useHobbies` is toggled (requires 3+ hobbies):

- **Weights (with ELO)**:
  - **PCA**: 60%
  - **Hobbies**: 25%
  - **ELO**: 15%

- **Weights (without ELO)**:
  - **PCA**: 70%
  - **Hobbies**: 30%

- **Calculation**:
  - `Cosine Similarity` between the user's `hobby_embedding` and candidates'.
  - Added to the weighted sum `score`.

## Technical Details

- **Database**: Uses `pgvector` extension.
- **Index**: HNSW index on `hobby_embedding` for future scalability (though current logic brute-forces the filtered candidate pool in-memory for precise multi-factor scoring).
- **Edge Function**: Deno runtime using `@xenova/transformers` for on-the-fly embedding generation.
