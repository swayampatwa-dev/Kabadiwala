# Pincode offers

User-approved extension: customers save their address/pincode under My address.
Recyclers save facility address, home and additional service pincodes, and INR/kg
buying rates under Service area & rates. Blank rates mean material not accepted.

Sell form stays blank on entry. Use saved address is explicit. After adding items,
enter a six-digit pincode and compare. Only approved recycler accounts covering
that pincode and every cart material appear. Rank by sum of weight × rate, highest
first. Weight is the total estimated line weight, not multiplied by quantity again.
No fallback or invented recycler offers are shown. An empty result is actionable.

Customer explicitly selects an offer. Server recomputes it before creation,
rejects stale prices, snapshots the line rates and targets that recycler account.
Other recyclers cannot accept the request. Initial acceptance uses the selected
amount; final settlement remains subject to measured weight and condition.

Settings live on user records and use existing database persistence; without a
database, local state is saved atomically under .local-data/state.json (gitignored).
No remote deployments are required. Local rates must first be entered by a recycler.
