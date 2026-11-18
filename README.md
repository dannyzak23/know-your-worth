# Know Your Worth

A free phone app for self-employed people who work by appointment: nail techs, hairdressers, barbers, beauty and laser therapists, massage and holistic therapists, physios, tattooists, personal trainers, coaches and dog groomers.

It works out what to charge from what things really cost you, and keeps your business in one place:

- prices from your products, running costs and what you want to earn
- a diary, client records, consultation forms and reminders
- money in and out, receipts and bills
- a rough guide to what to put aside for tax
- a tax pack for each tax year: a PDF of your Self Assessment figures, spreadsheets of every entry and all your receipt photos, to send to an accountant or a tax app
- a price list picture for Instagram or your wall
- a booking link for clients

**Try it:** https://dannyzak23.github.io/know-your-worth/

## Your data stays on your phone

Everything you type is saved in your own browser on your own device, and none of it is sent anywhere. (The page does load its fonts from Google Fonts.) Back it up from More, then 'Save a backup file'.

## Not tax or financial advice

The tax figures are estimates using 2026/27 UK rates. Check them with HMRC, an accountant or proper tax software before you rely on them.

## How it is built

The whole app is one HTML file, `index.html`, with no build step. Open it in a browser and it runs. The lettering comes from Google Fonts.

Two open-source libraries are built into the file, unchanged, to make the tax pack (they only start when you make one):

- [jsPDF](https://github.com/parallax/jsPDF) 4.2.1, MIT licence, (c) James Hall and yWorks GmbH: makes the PDF summary.
- [JSZip](https://github.com/Stuk/jszip) 3.10.2, MIT licence (dual MIT or GPLv3), (c) Stuart Knightley and contributors: bundles the pack into one zip file.

Their licence notices are kept at the top of each library inside `index.html`.

## Licence

Copyright (C) 2026 dannyzak23

Know Your Worth is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

It is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the [LICENSE](LICENSE) file for the full terms.

In short: you can use, change and share it. If you run a changed version for other people over the internet, you must share your changes under the same licence.

The name 'Know Your Worth' and its logo are not covered by this licence.
