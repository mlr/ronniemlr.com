---
title: Capybara waited for a request my test never checked
date: 2026-02-23
summary: 'A system test passed every step and then failed with "Requests did not finish in 60 seconds". A background request was searching 120 days ahead for a slot the test data made impossible.'
topics: [Ruby and Rails]
---

After a large merge, a system test for a booking page started to fail. Every step in the test passed. The failure came at the end, when Capybara reset the session:

```
RuntimeError: Requests did not finish in 60 seconds: ["/api/123/find_appointment?concern_id=456"]
```

Capybara waits for requests that are still running before it resets between tests. The booking page loads open time slots in the background, and the test never looked at them, so that request could take as long as it liked until the reset.

The request was slow because of the test data. A slot in this app needs two people from the same team. The factory gave the two test users different teams, so no slot ever matched, and the search kept going day by day until it hit its 120-day limit. Putting both users on one team fixed it. The test went from 64 seconds to about 5:

```
1 example, 0 failures
```

When Capybara names a request that didn't finish, look at what the page loads in the background, even if the test never checks it.
