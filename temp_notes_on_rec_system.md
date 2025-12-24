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

