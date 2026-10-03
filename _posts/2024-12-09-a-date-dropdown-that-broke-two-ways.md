---
title: A date dropdown that broke two ways
date: 2024-12-09
summary: 'Hidden select options still showed on phones, and a YYYY-MM-DD string parsed as the day before in Pacific time.'
topics: [JavaScript]
---

An event registration page asks for a location and a start date, then lists the events you can sign up for. Two selects depend on those answers. After you pick a location and a date, the event select should show only events at that location on or after that date. It had two separate bugs.

### Hidden options still show on phones

The filter hid options with jQuery's `.hide()`. On desktop they disappeared. In the native picker on my phone they were all still there. Mobile pickers, iOS for sure, ignore `display: none` on an `<option>`. `disabled` doesn't help either. The options stay visible, just grayed out.

Removing the options from the select, and keeping a master copy to rebuild from, works:

```js
function filterOptions($select, keep) {
  const current = $select.val();
  let $all = $select.data('all-options');
  if (!$all) {
    $all = $select.find('option').clone();
    $select.data('all-options', $all);
  }
  $select.empty().append(
    $all.filter(function () { return !this.value || keep($(this)); }).clone()
  );
  $select.val(current);
}
```

Read the current value before you empty the select. Otherwise the first filter run loses the user's choice.

### The date is a day early

Then options on the selected date disappeared too. The console showed why:

```js
new Date('2024-12-12')
// Wed Dec 11 2024 16:00:00 GMT-0800 (Pacific Standard Time)
```

JavaScript parses a date-only ISO string as midnight UTC. In Pacific time that's 4 PM the day before. The date picker's `12/12/2024` format parses as local midnight. So the two sides of the comparison were 8 hours apart.

Build both dates from their parts, in local time:

```js
const [m, d, y] = pickerValue.split('/').map(Number);
const selected = new Date(y, m - 1, d);

const [ey, em, ed] = option.dataset.date.split('-').map(Number);
const eventDate = new Date(ey, em - 1, ed);
```

Months are zero-based in that constructor, so it's `m - 1`. You can also skip Date entirely. `YYYY-MM-DD` strings sort correctly as plain strings, so converting the picker value to that format and comparing strings works too.
