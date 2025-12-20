# Recommendation Test Users (High-Similarity Pair)

Purpose: Validate that the recommendation engine surfaces nearly identical users for each other.

## Users

| Username    | Email                     | Password   | Age Group | Gender       | Character | PCA (dim1..4)                 | Avatar                                  |
|-------------|---------------------------|------------|-----------|--------------|-----------|--------------------------------|-----------------------------------------|
| similar_a   | similar_a@example.com     | Test1234!  | 18-24     | Non-Binary   | Explorer  | 0.120, 0.050, -0.080, 0.030    | https://placehold.co/320x320/png        |
| similar_b   | similar_b@example.com     | Test1234!  | 18-24     | Non-Binary   | Explorer  | 0.121, 0.051, -0.079, 0.031    | https://placehold.co/320x320/png        |

> Created via Supabase Admin API (email confirmed).

## Intended Questionnaire Result (Big Five, 0–1)

These correspond to the PCA above (nearly identical):
- Extraversion: 0.62
- Agreeableness: 0.68
- Conscientiousness: 0.64
- Emotional Stability: 0.58
- Intellect/Imagination: 0.66

## Verification Steps (App)
1) Log in as `similar_a` with filters OFF in Explore; `similar_b` should appear near the top of the pool.
2) Log in as `similar_b` and confirm `similar_a` appears similarly.

## DB Check (PCA vectors & similarity)

Run on Supabase DB:
```sql
select username, pca_dim1, pca_dim2, pca_dim3, pca_dim4
from public.profiles
where username in ('similar_a','similar_b');

-- Optional: cosine similarity
with pair as (
  select *
  from public.profiles
  where username in ('similar_a','similar_b')
)
select
  a.username as user_a,
  b.username as user_b,
  (a.pca_dim1*b.pca_dim1 + a.pca_dim2*b.pca_dim2 + a.pca_dim3*b.pca_dim3 + a.pca_dim4*b.pca_dim4)
  / nullif(
      sqrt(a.pca_dim1^2 + a.pca_dim2^2 + a.pca_dim3^2 + a.pca_dim4^2)
      * sqrt(b.pca_dim1^2 + b.pca_dim2^2 + b.pca_dim3^2 + b.pca_dim4^2),
      0
    ) as cos_sim
from pair a
join pair b on a.id <> b.id;
```

## ELO Check
- Current ELO (after seeding): both at 1200 (match_allow_elo = true).
- App effect: Swiping like/skip now calls `match-update` edge function, which updates ELO for both users (K=24) and logs `match_events`.
- To inspect ELO directly:
  ```sql
  select username, elo_rating, match_allow_elo from public.profiles where username in ('similar_a','similar_b');
  select * from public.match_events where actor_id in (select id from public.profiles where username in ('similar_a','similar_b'));
  ```

## Notes
- IDs: similar_a → b589e368-d4a2-4b31-b9b5-6ce78e682724; similar_b → ef48b40e-6cb8-4a38-9f2c-8954fa080a09.
- Avatar is a placeholder; filters default OFF to broaden results.
