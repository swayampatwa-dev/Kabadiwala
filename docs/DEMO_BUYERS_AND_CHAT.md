# Local demo buyers and order chat

## Hosted prototype authorization — 2026-09-24

The user explicitly requested the existing GitHub/Vercel/Render deployment to
behave like localhost, including dummy buyers, orders, selection and chat.
For this release demo fixtures are enabled by default in both environments.
Set ENABLE_DEMO=false on the API and VITE_ENABLE_DEMO=false on the frontend
and rebuild to disable fixture creation/preview. The older local-only notes
below describe the initial implementation and are superseded by this section.
Do not reset or seed the hosted database during release. This remains a demo
with prototype OTP authentication, not a production-ready marketplace.

Latest user request extends the household marketplace with explicitly fake
recyclers and private customer/recycler order chat. Existing UI is preserved.

## Try it

1. Add a material to the pickup cart, enter a complete address and six-digit pincode.
2. Eligible recycler offers load automatically when the cart and pincode are
   ready. Local development automatically activates the three demo buyers for
   that pincode. The manual Compare button remains available for retries.
   Before the cart is ready, three labelled preview cards are visible in the
   same area. They allow early recycler selection with a visible checkmark;
   that preference becomes the selected priced offer after the cart/pincode
   comparison succeeds. Selection alone cannot place an incomplete order.
   The setup button and
   credential block have been removed from the customer selling screen.
3. Three labelled demo buyers appear, ranked by sample total price. Select one
   and send the pickup request. These are not real businesses or market quotes.
4. Open My pickup orders → Order chat and send a message.
5. In a separate browser tab, log in as the chosen recycler:
   GreenLoop Demo: 9000000001; EcoCollect Demo: 9000000002;
   RenewHub Demo: 9000000003. All use prototype OTP 123456.
6. Open recycler household orders, reply in Order chat and accept the order.
   The existing collector assignment/pickup/delivery flow continues.

## Implementation and boundaries

- Recycler User orders locally initializes three labelled sample pickup orders
  assigned to the signed-in recycler. Stable IDs prevent duplicates or resetting
  completed orders. These belong to the demo customer (5555555555), allowing
  acceptance, chat, collector pickup and delivery to use the existing workflow.
  `/marketplace/demo-orders` is recycler-only and disabled in production mode.

- Seed activation is explicit, additive and idempotent by fixture ID/pincode;
  existing real or demo account settings are not overwritten.
- The activation API rejects production mode; its UI only appears in Vite dev.
- Chat is available after placement, even before recycler acceptance. Only the
  order's customer and selected/accepted recycler can read/send messages.
- Order JSON responses exclude embedded histories; the private messages endpoint
  returns them. Histories persist with orders through the existing adapter.
- UI polls every three seconds while chat is open. No WebSocket, external SMS,
  push service or automatic dummy replies are implied.
- Blank/overlong messages are rejected. Client request UUIDs prevent duplicate
  delivery on retry. Offline sends are blocked with a reconnect message; failed
  drafts remain in the open form. Drafts are not durable across page reloads.
- Message contents are rendered as plain React text, not HTML. Notifications
  include order references, not private message text.
- Tests cover comparison → placement → chat both ways → acceptance, duplicate
  sends, validation and unauthorized recycler/collector access.
- No deployment has been performed. Browser visual verification is separate
  from the automated API/typecheck/build gates.
