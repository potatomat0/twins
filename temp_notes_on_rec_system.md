this is a temp file, relevant notes will be added to official docs later
## elo testing 

seeded manually (password: Matkhautwins1!)
  
niche_cat@example.com: 1 on all big-5 question. male, age 18-24 
niche_dog@example_com: 1 on all big-5 questoin, except for question number 25 - chose 4 instead 
popular_cat@example.com: similar to niche_cat, but elo is pumped to 1400 instead of the default 1200 
popular_dog@example.com: similar to niche_dog, but elo is pumped to 1400 instead of the default 1200 

on the explore screen of popular cat

if elo not enabled, niche_cat is their top match (100% similarity)

however, if elo is enabled, popular dog (elo of around 1400, 96.4 similarity) is their top match, with niche_cat being second)

With the current blend (score = 0.8 * PCA + 0.2 * ELO proximity), your example behaves exactly as designed: Popular Cat (1400) sees Popular Dog (1400) ahead of Niche Cat (1200) because proximity for the same ELO is 1, while a 200-point gap gives proximity ≈ 0.606, so:
  - Popular Dog: (0.8 * 0.964) + (0.2 * 1) = 1.0
  - Niche Cat: (0.8 * 1 + 0.2) * 0.606 ≈ 0.921
___
## 
elo system explained: 
	- elo in Twins is a hidden score that indicates of how many likes they have given and have been given. user CANNOT see their actual elo score. 
	- by default, all match update - throuhg liking and skipping someone - will update the score of the actor (the user who skips or likes) and the target (the person that is given skip or like). 
	- However, elo can be toggled on or off by user on their explore screen. 
		- if enabled, elo should only account for 20% of user's priority, the other 80% is still personaltiy points. 
		- if elo is enabled, user with the most similar elo will be more likely to meet each other. 
		- if user skips someone, only they will recieve a penalty on their elo, picky/niche user will be more likely to match a picky/niche user 
	- note: the core principle of Twins is quality over quantity, meaningful connections over the number of matches, elo shouldn't be an indication of how universally interesting or uninteresting someone is, it's just a collaborative score. Elo is introduced as an additional filter for user, so that the more they use the app, the more accurate the match will be for them (whether they want more picky/niche, or more collaborative and open people)

*notes for the formula*:


In the personality matching, user score is calculated through the cosine_similarity to determine from 0-1 how similar they are. [Cosine similarity - Wikipedia](https://en.wikipedia.org/wiki/Cosine_similarity) 

We use an ELO proximity term to gently favor similar ratings:
  - Formula: proximity = exp(-|Δelo| / σ), with σ ≈ 400.
  - Example: User A 1200 vs User B 1400 → Δelo = 200 → proximity ≈ exp(-200/400) ≈ 0.6065.
  - In the current blend, final score = 0.8 * PCA + 0.2 * proximity. So with identical PCA (1.0), A sees B at ≈
    0.81 + 0.20.6065 ≈ 0.9213; if both were 1200 (Δ=0), proximity = 1.0, score = 1.0.

 
 ```
 
 ```a symmetric chess-style ELO can push higher-rated users down when lower-rated users “win” (like),
  which doesn’t map well to dating incentives. To keep equilibrium (1200s see 1200s) without incentivizing
  “gaming by skipping,” we can adjust both ranking and updates:

  Better ranking (keep “match similar rating” without punishing higher ELO for distance):

  - Use ELO proximity only to cluster similar ratings, not as a penalty. Keep PCA dominant.
  - Formula: score = 0.8 * PCA + 0.2 * proximity, where proximity = exp(-|Δelo|/σ). That already favors closer
    ratings; you can cap proximity floor (e.g., min 0.4) to avoid severe penalties for a 200–300 gap.

  Better updates (avoid “like = target loses”):

  - Make likes cooperative, not zero-sum:
      - Option A (asymmetric): On like, only target gains a small delta; actor unchanged. On skip, only actor
        loses a small delta. This rewards being liked and mildly penalizes initiating a skip, without punishing
        the liked user.
      - Option B (both light): On like, both gain a small amount; on skip, both lose a small amount. Still
        symmetric but not “winner/loser” zero-sum.
  - Use a small K (e.g., 8–12) and clamp to a range (e.g., 800–2000) to prevent runaway.
  - Consider giving “proximity bias” in ranking rather than rating inflation/deflation.
`
```

## threshhold to enable the NLP category matching 

- user must have more than 5 categories/keywords they have in their bio 
-... maybe we can implement this later with a clearer strategy


___







-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.match_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  target_id uuid NOT NULL,
  outcome text NOT NULL CHECK (outcome = ANY (ARRAY['like'::text, 'skip'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT match_events_pkey PRIMARY KEY (id),
  CONSTRAINT match_events_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES auth.users(id),
  CONSTRAINT match_events_target_id_fkey FOREIGN KEY (target_id) REFERENCES auth.users(id)
);
CREATE TABLE public.matches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL,
  user_b uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT matches_pkey PRIMARY KEY (id),
  CONSTRAINT matches_user_a_fkey FOREIGN KEY (user_a) REFERENCES auth.users(id),
  CONSTRAINT matches_user_b_fkey FOREIGN KEY (user_b) REFERENCES auth.users(id)
);
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'sent'::text CHECK (status = ANY (ARRAY['sending'::text, 'sent'::text, 'delivered'::text, 'seen'::text, 'error'::text])),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id),
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id),
  CONSTRAINT messages_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES auth.users(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL,
  actor_id uuid,
  type text NOT NULL CHECK (type = ANY (ARRAY['like'::text, 'mutual'::text, 'message'::text])),
  payload jsonb,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES auth.users(id),
  CONSTRAINT notifications_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES auth.users(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  username text,
  age_group text,
  gender text,
  created_at timestamp with time zone DEFAULT now(),
  character_group character varying,
  personality_fingerprint jsonb,
  avatar_url text,
  elo_rating numeric DEFAULT 1200,
  match_allow_elo boolean DEFAULT true,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.user_traits (
  user_id uuid NOT NULL,
  pca_dim1 double precision,
  pca_dim2 double precision,
  pca_dim3 double precision,
  pca_dim4 double precision,
  hobby_embedding USER-DEFINED,
  b5_cipher text,
  b5_iv text,
  hobbies_cipher text,
  hobbies_iv text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_traits_pkey PRIMARY KEY (user_id),
  CONSTRAINT user_traits_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
