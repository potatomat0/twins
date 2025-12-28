# Bug Report: Real-time UI Consistency & Notification Lifecycle

**Status:** Critical / Partially Resolved
**Date:** 2025-12-27

## 🚨 Current Issues

### 1. "Phantom Thread" / Missing Inbox Thread (Still Persisting)
**Behavior:**
*   User A and User B match.
*   The database correctly inserts rows into `public.matches` and `public.notifications` (via triggers).
*   However, User A's **Messages Screen (Inbox)** does NOT show the new empty thread immediately.
*   The thread only appears after a manual reload js on expo go or app restart.

**Root Cause Analysis:**
*   **Realtime Subscription:** `RealtimeManager` subscribes to `matches` inserts.
*   **Event Handling:** When `handleNewMatch` fires, it attempts to fetch the peer's profile to create a "Skeleton Thread".
*   **Failure Point:** If the profile fetch (`get_profile_lookup` RPC) fails, returns null, or is simply *too slow*, the UI update logic might be bailing out or race-conditioning with the UI render.
*   **Store Update:** `messagesStore.addThread` adds the item to the Zustand store array.
*   **Component Reactivity:** `MessagesScreen` subscribes to `state.threads`.
    *   *Suspicion:* The `FlatList` might not be re-rendering because of how the state update is shallow-compared, OR the "Skeleton Thread" logic is suppressing the add if profile data is missing (though I added a fallback).
    *   *Critical Gap:* The `messagesStore` initialization logic might be overwriting the optimistic add if `initialize()` runs concurrently or shortly after.

### 2. Notification Lifecycle (Stale "Like" Notification)
**Behavior:**
*   User receives "Someone liked you" notification.
*   User taps it -> Likes back -> Mutual match created.
*   **Issue:** The original "Someone liked you" notification remains in the list, cluttering it. A new "Mutual Match" notification appears above it.
*   **Desired Behavior:** When a "Like" notification is converted into a "Match" (by the user liking back), the original "Like" notification should be **deleted** or marked as handled/merged to avoid redundancy.

## 🛠 Recommendations for Next Developer

### A. Fix Inbox Thread Real-time Update
1.  **Audit `handleNewMatch` in `RealtimeManager.ts`:**
    *   Verify the `get_profile_lookup` RPC is accessible (permission-wise) for a user who *just* matched.
    *   Check console logs for `[RealtimeManager] Added new thread for...`. If this log appears but UI doesn't update, the issue is in `MessagesScreen` or `messagesStore`.
2.  **Force UI Refresh:**
    *   In `messagesStore.addThread`, ensure the new array reference is created properly (`[thread, ...state.threads]`).
    *   Consider adding a `lastUpdated` timestamp to the store to force `useEffect` triggers if needed.

### B. Implement Notification Cleanup Logic
1.  **Database Trigger Enhancement:**
    *   Modify `handle_new_match_notify` in `supabase/migrations/20251227170000_database_triggers.sql`.
    *   **Logic:** When inserting the "Mutual Match" notification, execute a `DELETE` query to remove any existing `type = 'like'` notification between these two actors.
    *   **SQL Logic:**
        ```sql
        -- Remove old 'like' notification
        DELETE FROM public.notifications
        WHERE recipient_id = new.user_a AND actor_id = new.user_b AND type = 'like';
        -- (Repeat for user_b)
        ```
2.  **Client-Side Optimistic Cleanup:**
    *   In `MatchesScreen.handleAction` (when liking back):
        *   Call `notificationStore.removeNotification(currentNotification.id)` to instantly hide the "Like" row.

## 🔍 Technical Context for Handoff

*   **State Management:** Zustand (`store/messagesStore.ts`, `store/notificationStore.ts`).
*   **Realtime:** Singleton `services/RealtimeManager.ts` manages subscriptions.
*   **Database:**
    *   Triggers (`handle_new_message_notify`, `handle_new_match_notify`) handle notification creation.
    *   `REPLICA IDENTITY FULL` is enabled on `matches`, `messages`, `notifications`.
*   **Security:** RLS is enabled; Edge Functions and RPCs bypass this for specific secure operations (`get-profile-details`).

**Immediate Action Item:** Run the provided SQL update to clean up "Like" notifications automatically upon matching. This is a low-risk, high-value fix.
