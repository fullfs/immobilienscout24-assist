# immobilienscout24-assist

## Installation & Getting Started

Run in console:
1. `npm install`
2. `npm run start`

In the app:
- Fill the `URL` field with full url you're using for search. Example:
`https://www.immobilienscout24.de/Suche/de/berlin/berlin/wohnung-mieten?sorting=2`

**Important**: insure you set `Sortieren nach` to `Aktualität (neueste zuerst)`. The assist understanding if the offer is new by it being on top of the list.

## Notifications to your phone

For the notifications https://pushover.net/ service is used.
You can use it 1 month for free, but then you have to pay $5 once.
Keep `pushover token` and `pushover user` fields empty if can you don't want to use phone notifications