---
type: article
fc-calendar: Gregorian Calendar
fc-date: 
year: 2025
month: November
day: 20
creation date: 2025-11-20 20:54
modification date: Thursday 20th November 2025 20:54:56
---

#twins 
## Article link:

related notes: 
- [[]]
_____
## Collecting data for PCA


## Scoring method - PCA encode - AES‑256‑GCM encrypt and decrypt for User personality result  


 - Raw Big Five scoring – entirely on the user’s device. Questionnaire answers stay in local state; we aggregate
    per trait in JS and pass those floats through the onboarding stack. Nothing leaves the device at this stage.
  - PCA‑4 projection – also on device. services/pcaEvaluator.ts contains the hard-coded mean + component matrix
    from your notebook. TypeScript uses those constants to compute the 4D vector before any network call, so the
    PCA fingerprint is produced locally.
  - AES encryption – this is where the server steps in. When Create Account / Verify Email prepares to upsert a
    Supabase profile:
      1. The app sends the raw Big Five map to the Supabase Edge Function score-crypto via
         supabase.functions.invoke.
      2. The edge function (running in Supabase’s serverless runtime) loads the secret B5_ENCRYPTION_KEY,
         encrypts the JSON payload using AES‑256‑GCM, and returns { cipher, iv }. Only the edge function sees the
         key; the client never stores it.
      3. The app receives the ciphertext + IV and stores them in public.profiles (b5_cipher, b5_iv) alongside
         the PCA dims. Later, when the Dashboard needs the original scores, it calls the same edge function with
         mode: 'decrypt' to turn those columns back into the trait map.

  So the actors are: device for scoring + PCA; Supabase edge function (with Supabase-managed secrets) for AES
  encrypt/decrypt; Supabase Postgres for persistence. No third-party beyond Supabase is involved.

right now it’s a single master key (B5_ENCRYPTION_KEY) shared across all users. The edge function uses that  one key with a fresh random IV per payload, so the same score set won’t produce the same ciphertext twice. But there isn’t a per-user key or envelope; everything hinges on that one secret. If you want stronger blast-radius  isolation later, we could switch to a hierarchical approach (e.g., store a unique data key per user encrypted with the master key), but today it’s “one key for all, new IV for each encrypt.”

 Having the client own the AES key would undermine the guarantees we’re aiming for:

  - Secrecy vs. convenience – if we bundle the key into the app (or derive it from user input), anyone who
    inspects the binary or proxies the traffic can extract it. At that point the DBA and a curious attacker have
    the same capability to decrypt, so we’ve gained nothing.
  - Data recovery – once the key is only on user devices, the backend can’t decrypt scores when the user
    reinstalls or logs in on another phone. That conflicts with the requirement “user can lose their local data
    and still retrieve the original scores.”
  - Server-side operations – we need the server to decrypt to, say, regenerate charts or run comparisons. If the
    key never leaves the device, the backend can’t help.

  Could we make users own their encryption keys? In theory, yes: you’d need a client-driven key hierarchy (per-ser keys stored locally or in a secure enclave) and a way to share that key with the server when needed—effectively building another authentication channel. But that shifts the risk surface (users forget keys, we
  can’t assist) while not protecting against DBAs who already have root access to Supabase tables (they’d still need the key, so we’d have to store it somewhere server-side anyway). So the current design uses a server-held master key: it keeps DBAs from decrypting rows, supports multi-device access, and limits blast radius to the edge-function secret. If we ever need stronger isolation, we can add per-user data keys encrypted with that master key (classic envelope encryption), but the user still wouldn’t “own” the key directly.



## Designing user schema 


## edge function for cold-start user recommendation 

- chunking based on basic info 
- cosine similarity 
- queue bracket 