---
title: 30909 doesn't say what's missing
date: 2026-05-15
summary: 'An A2P 10DLC campaign came back rejected with error 30909 and no detail. A Twilio reviewer''s list showed what the review checks, and every item had to line up before the campaign was approved.'
topics: [Integrations]
---

I work on a scheduling app that texts appointment reminders, and answers replies, for the businesses that use it. In US carrier terms the app is an ISV. It registers an A2P 10DLC campaign with Twilio for each business, under that business's own brand. Plenty of those campaigns had gone through. A new one came back rejected:

```
30909: Campaign rejected: Message Flow or Call to Action incomplete/unverified
```

There was no sub-code, and the first answer from support was a video and an FAQ link.

I started with the policy page the campaign pointed to. I added a section saying mobile numbers and opt-in data are never shared with third parties for marketing, a concrete message frequency (1 to 4 messages per appointment), and the exact phrase "Message and data rates may apply". I also took out two opt-in paths a reviewer couldn't check for themselves. One was a phone path the app doesn't have. The other was "verbal" consent, which in practice is staff ticking the same web-form checkbox.

Then I asked support what had actually failed, and a reviewer sent a numbered list. In short:

- Replies to customers' questions count as customer care. A campaign that sends reminders and also answers replies is **Low Volume Mixed**, not Account Notification.
- The campaign description has to say the messages are sent by a software vendor on the business's behalf.
- Sample messages have to name the business's brand.
- The consent text has to list every kind of message and the frequency.
- The privacy policy and terms have to be the business's own documents, with no vendor name in them.

The last point was the biggest change. The app now serves `/privacy` and `/terms` pages on each business's own subdomain, filled in from the account with the business's name and phone number. The consent checkbox, which is unchecked by default and not required to book, links to both:

```
By checking this box, I agree to receive text messages from {Brand}, including
appointment reminders and replies to questions I send about my appointment,
which may be sent using automated software. Message frequency varies, typically
1 to 4 messages per scheduled appointment. Message and data rates may apply.
Opt-in is not required to book your appointment. Reply STOP to opt out.
Privacy policy: /privacy. Terms: /terms.
```

I took a new screenshot of the form, rewrote the sample messages with the brand name plus STOP, HELP, and rates, changed the use case, and resubmitted. The first resubmission came back with the same bare 30909. The campaign was approved on a later review.

30909 covers everything from the form to the fine print, and it doesn't say which part failed. The reviewer compares the form, the screenshot, the message flow description, the samples, the use case, and both policy pages, and they all have to name the same brand and agree with each other. One small thing that caught me: the console's message flow field drops line breaks, so write it as plain sentences.
