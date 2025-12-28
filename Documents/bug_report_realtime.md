# Bug Report: Realtime Notification Failure

**Status:** Critical
**Date:** 2025-12-27

## Issue Description
Real-time updates for notifications (new messages, likes) and new inbox threads (matches) are failing to appear on the client device without a manual refresh.

## Root Cause Analysis
1.  **Edge Function Complexity:** The previous iteration of the `notify` edge function attempted to fetch the sender's profile server-side. It appears this fetch was failing (possibly due to RLS or timeouts), causing the entire notification INSERT to fail. When the INSERT fails, no realtime event is emitted.
2.  **Notification Logic:** We have reverted `notify` to trust the client payload. This isolates the failure: if notifications still don't appear, the issue is strictly in the **Supabase Realtime** infrastructure or the client-side `RealtimeManager` subscription logic, not the Edge Function business logic.
3.  **Realtime Subscription:** The client subscribes to `notifications` and `matches`. If `REPLICA IDENTITY` was not correctly propagated or if the connection is unstable, events are lost.

## Corrective Actions Taken
1.  **Reverted `notify` Function:** Removed server-side profile fetching. The function now simply inserts the payload provided by the client (`recipientId`, `actorId`, `type`, `payload`).
2.  **Client-Side Payload Fix:** The client (`ChatScreen.tsx`) was already updated to send the correct sender profile in the payload.
3.  **Database Config:** We previously enabled `REPLICA IDENTITY FULL` on all relevant tables.

## Verification Steps
1.  **Reload App:** Ensure the latest JS bundle is running (with the `ChatScreen` payload fix).
2.  **Send Message:** Send a message from User A to User B.
3.  **Check Logs:** User B should see `[RealtimeManager] New notification:` in the console logs.
4.  **UI Check:** User B's notification badge should increment instantly.

## Database Webhooks (Alternative)
If Supabase Realtime (Websockets) continues to be unreliable for this project, the alternative is **Database Webhooks**.
*   **Concept:** Configure a Postgres Trigger to send a POST request to a Google Cloud Function / AWS Lambda / Custom Server whenever a row is inserted into `notifications`.
*   **Pros:** Guaranteed delivery (with retries).
*   **Cons:** Requires an external push notification service (like Expo Push Notifications or OneSignal) to actually reach the device if the app is backgrounded.
*   **Current Architecture:** We rely on *in-app* WebSocket updates. Webhooks alone won't update the UI instantly unless they trigger a Push Notification that the OS handles.

**Next Immediate Step:** Test the simplified `notify` flow. If it works, the previous server-side fetch was indeed the blocker.
