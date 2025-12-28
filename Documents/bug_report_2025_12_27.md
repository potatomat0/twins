# Bug Report: Real-time Notifications & Messaging System

**Date:** 2025-12-27
**Status:** Critical / Broken
**Reporter:** AI Assistant (on behalf of User)

## 🚨 Executive Summary
The real-time notification and messaging system is non-functional. Users do not receive notifications for new messages or likes without manually refreshing the app. Additionally, when notifications do appear (after refresh), message notifications display incorrect sender information (often showing the recipient's own name). The "New Match" UI flow is broken, and conversation threads do not appear in the inbox upon matching.

---

## 1. Issue: No Real-time Notifications (Live Updates Failed)

### Symptoms
*   **User A** likes **User B** (who already liked A) -> **User B** receives NO "It's a Match" notification or modal instantly.
*   **User A** sends a message to **User B** -> **User B** receives NO notification instantly.
*   The `MatchesScreen` (Notification list) and `MessagesScreen` (Inbox) do not update automatically.
*   **Workaround:** User must manually reload the app (JS refresh) to see new items.

### Component Analysis

#### A. Database (`public.notifications`, `public.matches`)
*   **Schema:** Standard UUID PK, `recipient_id` FK, `payload` JSONB.
*   **Policies:** `service_insert` exists (for Edge Functions). `recipient_select` exists.
*   **Realtime Config:** `REPLICA IDENTITY FULL` was applied, and tables were added to `supabase_realtime` publication.
    *   *Potential Failure:* If the publication update failed or the client isn't subscribing to the *correct* channel event (e.g., filtering issues).

#### B. Edge Function (`notify`)
*   **Logic:** Receives `recipientId`, `actorId`, `type`. Inserts into `public.notifications`.
*   **Recent Changes:** Added server-side profile fetching to ensure `actor` details are present.
*   **Hypothesis:** The function might be crashing (500) if the profile fetch fails or permissions are wrong, preventing the INSERT entirely. If the INSERT fails, no Realtime event is emitted.

#### C. Client Service (`RealtimeManager.ts`)
*   **Role:** Singleton listener for `postgres_changes`.
*   **Subscriptions:**
    *   `notifications:USER_ID` -> Listen for `INSERT` on `public.notifications` where `recipient_id=USER_ID`.
*   **Status:** Logs show `SUBSCRIBED`.
*   **Hypothesis:** If the DB event isn't firing (due to failed function), this listener does nothing.

---

## 2. Issue: Incorrect Sender Info in Message Notifications

### Symptoms
*   **User A** sends "Hello" to **User B**.
*   **User B** sees a notification (after refresh).
*   **Display:** The notification implies it is from **User B** (themselves) or shows "Unknown", rather than "User A".
*   **Inbox Header:** When opening the chat from notification, the header might show the wrong name.

### Data Flow Analysis
1.  **ChatScreen (Client):** Calls `notify` edge function.
    *   *Payload:* `{ actor: { id: user.id, username: profile.username ... } }`.
    *   *Context:* `user.id` is the sender. `profile` *should* be the sender's profile from `AuthContext`.
2.  **Edge Function (`notify`):**
    *   *Logic:* Checks if `payload.actor` exists. If not, fetches from `public.profiles` using `actorId`.
    *   *Flaw:* If the client sends an incomplete actor object (e.g. null username), the server might not override it, or might fetch the wrong ID if `actorId` was passed incorrectly.

---

## 3. Issue: "Phantom Thread" / Missing Inbox Thread

### Symptoms
*   **User A** and **User B** match.
*   **User A** goes to Messages -> Empty list.
*   **User A** sends a message -> Thread appears.
*   **Expected:** An empty thread should appear immediately upon matching.

### Component Analysis
*   **`RealtimeManager.handleNewMatch`:**
    *   Listens for `INSERT` on `public.matches`.
    *   Calculates `peerId`.
    *   Fetches Peer Profile via `get_profile_lookup` RPC.
    *   Calls `messagesStore.addThread`.
*   **Failure Point:**
    *   `get_profile_lookup` might return null (RLS or data issue).
    *   The "Skeleton Thread" fallback might not be triggering the UI re-render in `MessagesScreen`.

---

## 🛠 Proposed Remediation Plan

1.  **Debug `notify` Edge Function:**
    *   Use `curl` to manually trigger a notification and inspect the HTTP response code.
    *   If it fails (500), revert the complex server-side fetching logic and trust the client payload (with validation).

2.  **Verify Realtime Filters:**
    *   Simplify `RealtimeManager` subscriptions. Instead of complex filters like `user_a=eq...`, verify if listening to `*` (all rows) and filtering client-side works first, to rule out filter syntax errors.

3.  **Fix Notification Payload:**
    *   Hardcode the `actor` payload in `ChatScreen` to strictly ensure it sends `id` and `username`. 
    *   Modify `MatchesScreen` to properly parse `item.payload.actor`.

4.  **UI State Reactivity:**
    *   Ensure `useMessagesStore` selector in `MessagesScreen` is actually triggering a re-render when `threads` array changes length.

---

## 🧪 Manual Test Procedures (Curl)

**1. Test Notification Insert (Bypass Client)**
```bash
curl -X POST 'https://gkbcdqpkjxdjjgolvgeg.supabase.co/functions/v1/notify' \
  -H "Authorization: Bearer [ANON_KEY]" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientId": "[TARGET_USER_ID]",
    "actorId": "[SENDER_USER_ID]",
    "type": "message",
    "payload": {
      "message": "Test from CURL",
      "actor": { "id": "[SENDER_USER_ID]", "username": "CurlSender" }
    }
  }'
```
*Expected:* HTTP 200 OK. Notification appears in app instantly.

**2. Test Match Creation**
*Cannot easily curl without admin key, rely on app flow.*

```