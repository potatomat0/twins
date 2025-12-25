# NLP Recommendation System

This document outlines the Natural Language Processing (NLP) recommendation layer in Twins.

## Overview
In addition to the Big Five Personality PCA (80%) and ELO (20%), Twins now supports **Interest Matching** via vector embeddings. This allows users to find matches based on shared hobbies and keywords.

## Architecture

### 1. Data Input
- Users add hobbies as free-text keywords in `UserSettingsScreen`.
- Constraints: 2-30 chars per hobby, max 10 hobbies.

### 2. Embedding Generation (`/functions/embed`)
- **Model**: Deterministic Hash-based Mock (Current Prototype).
- **Future**: `Supabase/gte-small` (via `@xenova/transformers`) when edge resources allow.
- **Process**:
  1. Client joins hobbies into a single string (e.g., "Hiking, Sci-Fi, Cooking").
  2. Calls `embed` edge function.
  3. Function returns a 384-dimensional vector.
- **Storage**:
  - `public.profiles.hobbies_cipher` (`text`): Encrypted keywords (AES-256-GCM) for privacy.
  - `public.profiles.hobby_embedding` (`vector(384)`): Generated vector for matching logic (DBA visible).
  - Plaintext `hobbies` column is deprecated/unused.

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

- **Database**: Uses `pgvector` extension. All data resides in `public.profiles` (Single Table Architecture).
- **Index**: HNSW index on `hobby_embedding`.
- **Edge Function**: Deno runtime.